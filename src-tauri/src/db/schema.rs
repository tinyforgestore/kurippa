use rusqlite::{Connection, Result};

/// Open (or create) the database at the given path and run schema migrations.
pub fn open(path: &std::path::Path) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS items (
             id          INTEGER PRIMARY KEY AUTOINCREMENT,
             kind        TEXT    NOT NULL,
             text        TEXT,
             html        TEXT,
             rtf         TEXT,
             image_path  TEXT,
             source_app  TEXT,
             created_at  INTEGER NOT NULL,
             pinned      INTEGER NOT NULL DEFAULT 0,
             folder_id   INTEGER
         );
         CREATE INDEX IF NOT EXISTS idx_items_pinned_created
             ON items(pinned, created_at DESC);
         CREATE TABLE IF NOT EXISTS item_formats (
             item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
             format_type TEXT    NOT NULL,
             data        BLOB    NOT NULL,
             PRIMARY KEY (item_id, format_type)
         );
         CREATE INDEX IF NOT EXISTS idx_item_formats_item_id
             ON item_formats(item_id);
         CREATE TABLE IF NOT EXISTS folders (
             id         INTEGER PRIMARY KEY AUTOINCREMENT,
             name       TEXT    NOT NULL,
             created_at INTEGER NOT NULL,
             position   INTEGER NOT NULL DEFAULT 0
         );",
    )?;
    let _ = conn.execute("ALTER TABLE items ADD COLUMN qr_text TEXT", []);
    let _ = conn.execute("ALTER TABLE items ADD COLUMN image_width INTEGER", []);
    let _ = conn.execute("ALTER TABLE items ADD COLUMN image_height INTEGER", []);
    Ok(conn)
}
