use std::collections::{HashMap, VecDeque};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

use base64::Engine;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::errors::{AppError, AppResult};

const BACKLOG_CAP: usize = 256 * 1024;

#[derive(Debug, Clone, Serialize)]
pub struct PtyTabInfo {
    pub session_id: String,
    pub run_id: Option<String>,
    pub step_id: Option<String>,
    pub label: String,
    pub cwd: String,
    pub command: String,
}

#[derive(Clone, Serialize)]
struct PtyOutputPayload {
    data: String,
}

#[derive(Clone, Serialize)]
struct PtyExitPayload {
    code: Option<i32>,
}

struct PtySession {
    info: PtyTabInfo,
    writer: Mutex<Box<dyn Write + Send>>,
    master: Mutex<Box<dyn MasterPty + Send>>,
    child: Mutex<Box<dyn portable_pty::Child + Send + Sync>>,
    backlog: Mutex<VecDeque<u8>>,
    #[allow(dead_code)]
    exited: AtomicBool,
}

pub struct PtyManager {
    sessions: Mutex<HashMap<String, Arc<PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn spawn(
        &self,
        app: AppHandle,
        cwd: &str,
        command: Option<&str>,
        label: &str,
        run_id: Option<String>,
        step_id: Option<String>,
    ) -> AppResult<PtyTabInfo> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::SpawnFailed(e.to_string()))?;

        let mut cmd_builder = CommandBuilder::new("cmd.exe");
        let command_str = command.unwrap_or_default().to_string();
        if let Some(c) = command {
            let full_command = format!("chcp 65001 >NUL & {}", c);
            cmd_builder.args(["/C", &full_command]);
        } else {
            cmd_builder.args(["/K", "chcp 65001 >NUL"]);
        }
        cmd_builder.cwd(cwd);

        let child = pair
            .slave
            .spawn_command(cmd_builder)
            .map_err(|e| AppError::SpawnFailed(e.to_string()))?;
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| AppError::SpawnFailed(e.to_string()))?;
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| AppError::SpawnFailed(e.to_string()))?;

        let session_id = Uuid::new_v4().to_string();
        let info = PtyTabInfo {
            session_id: session_id.clone(),
            run_id,
            step_id,
            label: label.to_string(),
            cwd: cwd.to_string(),
            command: command_str,
        };

        let session = Arc::new(PtySession {
            info: info.clone(),
            writer: Mutex::new(writer),
            master: Mutex::new(pair.master),
            child: Mutex::new(child),
            backlog: Mutex::new(VecDeque::new()),
            exited: AtomicBool::new(false),
        });

        self.sessions
            .lock()
            .unwrap()
            .insert(session_id.clone(), session.clone());

        let read_session = session.clone();
        let read_app = app.clone();
        let read_session_id = session_id.clone();
        thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = &buf[..n];
                        {
                            let mut backlog = read_session.backlog.lock().unwrap();
                            backlog.extend(chunk.iter().copied());
                            let excess = backlog.len().saturating_sub(BACKLOG_CAP);
                            if excess > 0 {
                                backlog.drain(0..excess);
                            }
                        }
                        let encoded = base64::engine::general_purpose::STANDARD.encode(chunk);
                        let _ = read_app.emit(
                            &format!("pty:{}:output", read_session_id),
                            PtyOutputPayload { data: encoded },
                        );
                    }
                    Err(_) => break,
                }
            }
            read_session.exited.store(true, Ordering::SeqCst);
            let code = read_session
                .child
                .lock()
                .unwrap()
                .try_wait()
                .ok()
                .flatten()
                .map(|status| status.exit_code() as i32);
            let _ = read_app.emit(
                &format!("pty:{}:exit", read_session_id),
                PtyExitPayload { code },
            );
        });

        Ok(info)
    }

    pub fn write(&self, session_id: &str, data: &str) -> AppResult<()> {
        let session = self.get_session(session_id)?;
        let mut writer = session.writer.lock().unwrap();
        writer
            .write_all(data.as_bytes())
            .map_err(|e| AppError::Other(e.to_string()))?;
        writer.flush().map_err(|e| AppError::Other(e.to_string()))?;
        Ok(())
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> AppResult<()> {
        let session = self.get_session(session_id)?;
        let master = session.master.lock().unwrap();
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::Other(e.to_string()))?;
        Ok(())
    }

    pub fn kill(&self, session_id: &str) -> AppResult<()> {
        let session = self.get_session(session_id)?;
        {
            let mut child = session.child.lock().unwrap();
            if let Some(pid) = child.process_id() {
                kill_process_tree(pid);
            }
            let _ = child.kill();
        }
        self.sessions.lock().unwrap().remove(session_id);
        Ok(())
    }

    pub fn kill_run(&self, run_id: &str) -> AppResult<()> {
        let ids: Vec<String> = {
            let sessions = self.sessions.lock().unwrap();
            sessions
                .values()
                .filter(|s| s.info.run_id.as_deref() == Some(run_id))
                .map(|s| s.info.session_id.clone())
                .collect()
        };
        for id in ids {
            let _ = self.kill(&id);
        }
        Ok(())
    }

    pub fn kill_all(&self) {
        let ids: Vec<String> = self.sessions.lock().unwrap().keys().cloned().collect();
        for id in ids {
            let _ = self.kill(&id);
        }
    }

    pub fn get_backlog(&self, session_id: &str) -> AppResult<String> {
        let session = self.get_session(session_id)?;
        let backlog = session.backlog.lock().unwrap();
        let bytes: Vec<u8> = backlog.iter().copied().collect();
        Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
    }

    pub fn list_active(&self) -> Vec<PtyTabInfo> {
        self.sessions
            .lock()
            .unwrap()
            .values()
            .map(|s| s.info.clone())
            .collect()
    }

    fn get_session(&self, session_id: &str) -> AppResult<Arc<PtySession>> {
        self.sessions
            .lock()
            .unwrap()
            .get(session_id)
            .cloned()
            .ok_or_else(|| AppError::NotFound(format!("session {session_id}")))
    }
}

/// Killing just the immediate child (cmd.exe) doesn't kill the processes it spawned
/// (e.g. the node.exe behind `npm run dev`) — Windows' TerminateProcess only ever
/// touches the one process, never its descendants. `taskkill /T` walks the whole tree.
#[cfg(windows)]
fn kill_process_tree(pid: u32) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let _ = std::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

#[cfg(not(windows))]
fn kill_process_tree(_pid: u32) {}
