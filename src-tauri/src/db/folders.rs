use rusqlite::{Connection, Result, params};

use super::types::Folder;

pub fn get_folders(conn: &Connection) -> Result<Vec<Folder>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, created_at, position FROM folders ORDER BY position ASC, id ASC",
    )?;
    let rows = stmt.query_map([], |row| Ok(Folder {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
        position: row.get(3)?,
    }))?;
    rows.collect()
}

pub fn count_folders(conn: &Connection) -> Result<i64> {
    conn.query_row("SELECT COUNT(*) FROM folders", [], |r| r.get(0))
}

pub fn create_folder(conn: &Connection, name: &str, now: i64) -> Result<Folder> {
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM folders",
        [],
        |r| r.get(0),
    )?;
    conn.execute(
        "INSERT INTO folders (name, created_at, position) VALUES (?1, ?2, ?3)",
        params![name, now, position],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Folder { id, name: name.to_string(), created_at: now, position })
}

pub fn rename_folder(conn: &Connection, id: i64, name: &str) -> Result<()> {
    conn.execute("UPDATE folders SET name = ?1 WHERE id = ?2", params![name, id])?;
    Ok(())
}

/// Delete a folder and return its items to regular history (items keep their data, folder_id cleared).
pub fn delete_folder_only(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("UPDATE items SET folder_id = NULL WHERE folder_id = ?1", params![id])?;
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
    Ok(())
}

/// Delete a folder and all its items. Returns image_paths of deleted items for disk cleanup.
pub fn delete_folder_with_items(conn: &Connection, id: i64) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT image_path FROM items WHERE folder_id = ?1 AND image_path IS NOT NULL",
    )?;
    let paths: Vec<String> = stmt
        .query_map(params![id], |row| row.get::<_, String>(0))?
        .filter_map(|r| r.ok())
        .collect();
    conn.execute("DELETE FROM items WHERE folder_id = ?1", params![id])?;
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
    Ok(paths)
}

pub fn move_item_to_folder(conn: &Connection, item_id: i64, folder_id: i64) -> Result<()> {
    conn.execute(
        "UPDATE items SET folder_id = ?1, pinned = 0 WHERE id = ?2",
        params![folder_id, item_id],
    )?;
    Ok(())
}

pub fn remove_item_from_folder(conn: &Connection, item_id: i64) -> Result<()> {
    conn.execute("UPDATE items SET folder_id = NULL WHERE id = ?1", params![item_id])?;
    Ok(())
}
