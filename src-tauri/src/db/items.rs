use rusqlite::{Connection, OptionalExtension, Result, params};

use super::types::ClipboardItem;
use super::MAX_HISTORY;

const ITEM_COLUMNS: &str =
    "id, kind, text, html, rtf, image_path, source_app, created_at, \
     pinned, folder_id, qr_text, image_width, image_height";

fn row_to_item(row: &rusqlite::Row) -> rusqlite::Result<ClipboardItem> {
    Ok(ClipboardItem {
        id: row.get(0)?,
        kind: row.get(1)?,
        text: row.get(2)?,
        html: row.get(3)?,
        rtf: row.get(4)?,
        image_path: row.get(5)?,
        source_app: row.get(6)?,
        created_at: row.get(7)?,
        pinned: row.get::<_, i32>(8)? != 0,
        folder_id: row.get(9)?,
        qr_text: row.get(10)?,
        image_width: row.get(11)?,
        image_height: row.get(12)?,
    })
}

/// Insert a new clipboard item and evict old non-pinned items beyond MAX_HISTORY.
/// Returns `(rowid, evicted_image_paths)` where `evicted_image_paths` is the list
/// of `image_path` values from rows that were deleted during eviction.
pub fn insert_item(conn: &Connection, item: &ClipboardItem) -> Result<(i64, Vec<String>)> {
    conn.execute(
        "INSERT INTO items (kind, text, html, rtf, image_path, source_app, created_at, pinned, folder_id, image_width, image_height)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            item.kind,
            item.text,
            item.html,
            item.rtf,
            item.image_path,
            item.source_app,
            item.created_at,
            item.pinned as i32,
            item.folder_id,
            item.image_width,
            item.image_height,
        ],
    )?;
    let id = conn.last_insert_rowid();

    // Wrap the eviction SELECT + DELETE in a transaction so the set of rows
    // queried for paths and the rows actually deleted are always consistent.
    let tx = conn.unchecked_transaction()?;

    // Collect the image_path values for rows that are about to be evicted,
    // so the caller can delete those files after releasing the DB lock.
    let mut evicted_paths: Vec<String> = Vec::new();
    {
        let mut stmt = tx.prepare(
            "SELECT image_path FROM items
             WHERE pinned = 0
               AND folder_id IS NULL
               AND id NOT IN (
                   SELECT id FROM items WHERE pinned = 0 AND folder_id IS NULL ORDER BY created_at DESC, id DESC LIMIT ?1
               )
               AND image_path IS NOT NULL",
        )?;
        let paths = stmt.query_map(params![MAX_HISTORY], |row| row.get::<_, String>(0))?;
        for p in paths {
            evicted_paths.push(p?);
        }
    }

    // Evict oldest non-pinned, non-folder items beyond the cap.
    tx.execute(
        "DELETE FROM items
         WHERE pinned = 0
           AND folder_id IS NULL
           AND id NOT IN (
               SELECT id FROM items WHERE pinned = 0 AND folder_id IS NULL ORDER BY created_at DESC, id DESC LIMIT ?1
           )",
        params![MAX_HISTORY],
    )?;

    tx.commit()?;

    Ok((id, evicted_paths))
}

/// Delete a single item by id. Used to clean up rows whose associated file
/// could not be finalised after insert (e.g. a failed image rename).
pub fn delete_item(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM items WHERE id = ?1", params![id])?;
    Ok(())
}

/// Set `pinned = 1` on the item with the given id and clear its folder_id (pin/folder are mutually exclusive).
pub fn pin_item(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("UPDATE items SET pinned = 1, folder_id = NULL WHERE id = ?1", params![id])?;
    Ok(())
}

/// Set `pinned = 0` on the item with the given id.
pub fn unpin_item(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("UPDATE items SET pinned = 0 WHERE id = ?1", params![id])?;
    Ok(())
}

/// Set `qr_text` on the item with the given id.
pub fn update_qr_text(conn: &Connection, id: i64, qr_text: &str) -> Result<()> {
    conn.execute("UPDATE items SET qr_text = ?1 WHERE id = ?2", params![qr_text, id])?;
    Ok(())
}

/// Update `created_at` on the item with the given id and return the updated row.
pub fn touch_item(conn: &Connection, id: i64, now: i64) -> Result<ClipboardItem> {
    conn.execute(
        "UPDATE items SET created_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    conn.query_row(
        &format!("SELECT {ITEM_COLUMNS} FROM items WHERE id = ?1"),
        params![id],
        row_to_item,
    )
}

/// Delete the item with the given id and return its `image_path` if present.
pub fn delete_item_with_path(conn: &Connection, id: i64) -> Result<Option<String>> {
    // row.get::<_, Option<String>> is required: without the explicit type,
    // inference picks T = String (to satisfy Option<String> after .optional()),
    // which fails with InvalidColumnType when image_path is NULL.
    let path = conn
        .query_row(
            "SELECT image_path FROM items WHERE id = ?1",
            params![id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?
        .flatten();
    conn.execute("DELETE FROM items WHERE id = ?1", params![id])?;
    Ok(path)
}

/// Insert raw format blobs for an item.  A no-op if `formats` is empty.
pub fn insert_item_formats(
    conn: &Connection,
    item_id: i64,
    formats: &[(String, Vec<u8>)],
) -> Result<()> {
    if formats.is_empty() {
        return Ok(());
    }
    let mut stmt = conn.prepare_cached(
        "INSERT OR REPLACE INTO item_formats (item_id, format_type, data) VALUES (?1, ?2, ?3)",
    )?;
    for (fmt, data) in formats {
        stmt.execute(params![item_id, fmt, data])?;
    }
    Ok(())
}

/// Fetch all raw format blobs for an item, ordered by format_type.
pub fn get_item_formats(
    conn: &Connection,
    item_id: i64,
) -> Result<Vec<(String, Vec<u8>)>> {
    let mut stmt = conn.prepare_cached(
        "SELECT format_type, data FROM item_formats WHERE item_id = ?1 ORDER BY format_type",
    )?;
    let rows = stmt.query_map(params![item_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, Vec<u8>>(1)?))
    })?;
    rows.collect()
}

/// Delete all non-pinned, non-folder items and return the image paths of deleted items.
pub fn clear_history(conn: &Connection) -> Result<Vec<String>> {
    let mut stmt = conn.prepare_cached(
        "SELECT image_path FROM items WHERE pinned = 0 AND folder_id IS NULL AND image_path IS NOT NULL",
    )?;
    let paths: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .filter_map(|r| r.ok())
        .collect();
    conn.execute("DELETE FROM items WHERE pinned = 0 AND folder_id IS NULL", [])?;
    Ok(paths)
}

/// Fetch recent clipboard items ordered newest-first.
/// Always includes folder items (they are exempt from the limit cutoff).
pub fn get_history(conn: &Connection, limit: u32) -> Result<Vec<ClipboardItem>> {
    let mut stmt = conn.prepare_cached(
        &format!(
            "SELECT {ITEM_COLUMNS} FROM items \
             WHERE folder_id IS NOT NULL \
                OR id IN (SELECT id FROM items ORDER BY created_at DESC, id DESC LIMIT ?1) \
             ORDER BY created_at DESC, id DESC"
        ),
    )?;
    let rows = stmt.query_map(params![limit], row_to_item)?;
    rows.collect()
}

/// Fetch the text content of items by their IDs, preserving the input order.
/// Items that have no text or do not exist are skipped (not included in the result).
pub fn get_item_texts(conn: &Connection, ids: &[i64]) -> Result<Vec<String>> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let placeholders = ids
        .iter()
        .enumerate()
        .map(|(i, _)| format!("?{}", i + 1))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!("SELECT id, text FROM items WHERE id IN ({placeholders})");
    let mut stmt = conn.prepare(&sql)?;
    let mut map: std::collections::HashMap<i64, String> = stmt
        .query_map(rusqlite::params_from_iter(ids.iter()), |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?))
        })?
        .filter_map(|r| r.ok())
        .filter_map(|(id, text)| {
            text.filter(|t| !t.is_empty()).map(|t| (id, t))
        })
        .collect();
    Ok(ids.iter().filter_map(|id| map.remove(id)).collect())
}
