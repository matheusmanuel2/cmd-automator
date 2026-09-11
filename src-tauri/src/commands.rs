use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::automations::{Automation, AutomationStore, StepInput};
use crate::errors::AppResult;
use crate::pty_manager::{PtyManager, PtyTabInfo};

#[derive(serde::Serialize)]
pub struct RunSession {
    pub run_id: String,
    pub automation_id: String,
    pub tabs: Vec<PtyTabInfo>,
}

#[tauri::command]
pub fn list_automations(store: State<Mutex<AutomationStore>>) -> AppResult<Vec<Automation>> {
    Ok(store.lock().unwrap().list())
}

#[tauri::command]
pub fn get_automation(store: State<Mutex<AutomationStore>>, id: String) -> AppResult<Automation> {
    store.lock().unwrap().get(&id)
}

#[tauri::command]
pub fn create_automation(
    store: State<Mutex<AutomationStore>>,
    name: String,
    steps: Vec<StepInput>,
) -> AppResult<Automation> {
    store.lock().unwrap().create(name, steps)
}

#[tauri::command]
pub fn update_automation(
    store: State<Mutex<AutomationStore>>,
    id: String,
    name: String,
    steps: Vec<StepInput>,
) -> AppResult<Automation> {
    store.lock().unwrap().update(&id, name, steps)
}

#[tauri::command]
pub fn delete_automation(store: State<Mutex<AutomationStore>>, id: String) -> AppResult<()> {
    store.lock().unwrap().delete(&id)
}

#[tauri::command]
pub fn start_automation(
    app: AppHandle,
    store: State<Mutex<AutomationStore>>,
    pty_manager: State<PtyManager>,
    automation_id: String,
) -> AppResult<RunSession> {
    let automation = store.lock().unwrap().get(&automation_id)?;
    let run_id = uuid::Uuid::new_v4().to_string();
    let mut tabs = Vec::new();
    for step in &automation.steps {
        let label = step
            .label
            .clone()
            .unwrap_or_else(|| step.command.clone());
        let info = pty_manager.spawn(
            app.clone(),
            &step.cwd,
            Some(&step.command),
            &label,
            Some(run_id.clone()),
            Some(step.id.clone()),
        )?;
        tabs.push(info);
    }
    Ok(RunSession {
        run_id,
        automation_id,
        tabs,
    })
}

#[tauri::command]
pub fn start_free_terminal(
    app: AppHandle,
    pty_manager: State<PtyManager>,
    cwd: Option<String>,
) -> AppResult<PtyTabInfo> {
    let dir =
        cwd.unwrap_or_else(|| std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string()));
    pty_manager.spawn(app, &dir, None, "Terminal", None, None)
}

#[tauri::command]
pub fn write_to_pty(
    pty_manager: State<PtyManager>,
    session_id: String,
    data: String,
) -> AppResult<()> {
    pty_manager.write(&session_id, &data)
}

#[tauri::command]
pub fn resize_pty(
    pty_manager: State<PtyManager>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> AppResult<()> {
    pty_manager.resize(&session_id, cols, rows)
}

#[tauri::command]
pub fn stop_pty(pty_manager: State<PtyManager>, session_id: String) -> AppResult<()> {
    pty_manager.kill(&session_id)
}

#[tauri::command]
pub fn stop_automation(pty_manager: State<PtyManager>, run_id: String) -> AppResult<()> {
    pty_manager.kill_run(&run_id)
}

#[tauri::command]
pub fn get_pty_backlog(pty_manager: State<PtyManager>, session_id: String) -> AppResult<String> {
    pty_manager.get_backlog(&session_id)
}

#[tauri::command]
pub fn list_active_sessions(pty_manager: State<PtyManager>) -> Vec<PtyTabInfo> {
    pty_manager.list_active()
}
