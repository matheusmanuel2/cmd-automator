use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::errors::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationStep {
    pub id: String,
    pub label: Option<String>,
    pub cwd: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Automation {
    pub id: String,
    pub name: String,
    pub steps: Vec<AutomationStep>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepInput {
    pub label: Option<String>,
    pub cwd: String,
    pub command: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct AutomationsFile {
    version: u32,
    automations: Vec<Automation>,
}

impl Default for AutomationsFile {
    fn default() -> Self {
        AutomationsFile {
            version: 1,
            automations: Vec::new(),
        }
    }
}

pub struct AutomationStore {
    file_path: PathBuf,
    data: AutomationsFile,
}

impl AutomationStore {
    pub fn load(app: &AppHandle) -> AppResult<Self> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Other(e.to_string()))?;
        fs::create_dir_all(&dir)?;
        let file_path = dir.join("automations.json");
        let data = if file_path.exists() {
            let content = fs::read_to_string(&file_path)?;
            serde_json::from_str(&content)?
        } else {
            AutomationsFile::default()
        };
        Ok(Self { file_path, data })
    }

    fn persist(&self) -> AppResult<()> {
        let content = serde_json::to_string_pretty(&self.data)?;
        fs::write(&self.file_path, content)?;
        Ok(())
    }

    pub fn list(&self) -> Vec<Automation> {
        self.data.automations.clone()
    }

    pub fn get(&self, id: &str) -> AppResult<Automation> {
        self.data
            .automations
            .iter()
            .find(|a| a.id == id)
            .cloned()
            .ok_or_else(|| AppError::NotFound(format!("automation {id}")))
    }

    pub fn create(&mut self, name: String, steps: Vec<StepInput>) -> AppResult<Automation> {
        let now = Utc::now().to_rfc3339();
        let automation = Automation {
            id: Uuid::new_v4().to_string(),
            name,
            steps: steps.into_iter().map(step_from_input).collect(),
            created_at: now.clone(),
            updated_at: now,
        };
        self.data.automations.push(automation.clone());
        self.persist()?;
        Ok(automation)
    }

    pub fn update(&mut self, id: &str, name: String, steps: Vec<StepInput>) -> AppResult<Automation> {
        let pos = self
            .data
            .automations
            .iter()
            .position(|a| a.id == id)
            .ok_or_else(|| AppError::NotFound(format!("automation {id}")))?;
        let created_at = self.data.automations[pos].created_at.clone();
        let automation = Automation {
            id: id.to_string(),
            name,
            steps: steps.into_iter().map(step_from_input).collect(),
            created_at,
            updated_at: Utc::now().to_rfc3339(),
        };
        self.data.automations[pos] = automation.clone();
        self.persist()?;
        Ok(automation)
    }

    pub fn delete(&mut self, id: &str) -> AppResult<()> {
        let before = self.data.automations.len();
        self.data.automations.retain(|a| a.id != id);
        if self.data.automations.len() == before {
            return Err(AppError::NotFound(format!("automation {id}")));
        }
        self.persist()
    }
}

fn step_from_input(input: StepInput) -> AutomationStep {
    AutomationStep {
        id: Uuid::new_v4().to_string(),
        label: input.label,
        cwd: input.cwd,
        command: input.command,
    }
}
