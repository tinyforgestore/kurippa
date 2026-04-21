use serde::{Deserialize, Serialize};

/// Mirrors the `items` table row.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub id: i64,
    pub kind: String,
    pub text: Option<String>,
    pub html: Option<String>,
    pub rtf: Option<String>,
    pub image_path: Option<String>,
    pub source_app: Option<String>,
    pub created_at: i64,
    pub pinned: bool,
    pub folder_id: Option<i64>,
    pub qr_text: Option<String>,
    pub image_width: Option<i64>,
    pub image_height: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: i64,
    pub name: String,
    pub created_at: i64,
    pub position: i64,
}
