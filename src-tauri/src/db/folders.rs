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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{insert_item, types::ClipboardItem};

    fn in_memory_db() -> Connection {
        crate::db::open(std::path::Path::new(":memory:"))
            .expect("failed to open in-memory DB")
    }

    fn make_item(text: &str, created_at: i64) -> ClipboardItem {
        ClipboardItem {
            id: 0,
            kind: "text".to_string(),
            text: Some(text.to_string()),
            html: None,
            rtf: None,
            image_path: None,
            source_app: None,
            created_at,
            pinned: false,
            folder_id: None,
            qr_text: None,
            image_width: None,
            image_height: None,
        }
    }

    // ------------------------------------------------------------------
    // get_folders()
    // ------------------------------------------------------------------

    #[test]
    fn get_folders_empty_db_returns_empty_vec() {
        let conn = in_memory_db();
        let folders = get_folders(&conn).expect("get_folders should succeed");
        assert!(folders.is_empty(), "empty DB should return empty vec");
    }

    #[test]
    fn get_folders_returns_both_folders_ordered_by_position() {
        let conn = in_memory_db();
        create_folder(&conn, "Alpha", 1000).expect("create_folder Alpha");
        create_folder(&conn, "Beta", 2000).expect("create_folder Beta");

        let folders = get_folders(&conn).expect("get_folders should succeed");
        assert_eq!(folders.len(), 2);
        assert_eq!(folders[0].name, "Alpha");
        assert_eq!(folders[0].position, 0);
        assert_eq!(folders[1].name, "Beta");
        assert_eq!(folders[1].position, 1);
    }

    // ------------------------------------------------------------------
    // count_folders()
    // ------------------------------------------------------------------

    #[test]
    fn count_folders_returns_zero_on_empty_db() {
        let conn = in_memory_db();
        let count = count_folders(&conn).expect("count_folders should succeed");
        assert_eq!(count, 0);
    }

    #[test]
    fn count_folders_returns_correct_count_after_inserts() {
        let conn = in_memory_db();
        create_folder(&conn, "F1", 1000).expect("create F1");
        create_folder(&conn, "F2", 2000).expect("create F2");
        create_folder(&conn, "F3", 3000).expect("create F3");

        let count = count_folders(&conn).expect("count_folders should succeed");
        assert_eq!(count, 3);
    }

    // ------------------------------------------------------------------
    // create_folder()
    // ------------------------------------------------------------------

    #[test]
    fn create_folder_first_gets_position_zero() {
        let conn = in_memory_db();
        let folder = create_folder(&conn, "First", 1000).expect("create_folder should succeed");
        assert_eq!(folder.position, 0);
        assert_eq!(folder.name, "First");
        assert!(folder.id > 0, "id must be positive");
    }

    #[test]
    fn create_folder_second_gets_position_one() {
        let conn = in_memory_db();
        let _first = create_folder(&conn, "First", 1000).expect("create first folder");
        let second = create_folder(&conn, "Second", 2000).expect("create second folder");
        assert_eq!(second.position, 1);
        assert_eq!(second.name, "Second");
    }

    // ------------------------------------------------------------------
    // rename_folder()
    // ------------------------------------------------------------------

    #[test]
    fn rename_folder_updates_name_correctly() {
        let conn = in_memory_db();
        let folder = create_folder(&conn, "OldName", 1000).expect("create folder");
        rename_folder(&conn, folder.id, "NewName").expect("rename_folder should succeed");

        let folders = get_folders(&conn).expect("get_folders");
        assert_eq!(folders[0].name, "NewName");
    }

    #[test]
    fn rename_folder_nonexistent_id_is_noop() {
        let conn = in_memory_db();
        // Should not crash or return error for a missing id
        rename_folder(&conn, 9999, "Ghost").expect("rename_folder on missing id should be Ok");
        // No folders exist, verify nothing changed
        let folders = get_folders(&conn).expect("get_folders");
        assert!(folders.is_empty());
    }

    // ------------------------------------------------------------------
    // delete_folder_only()
    // ------------------------------------------------------------------

    #[test]
    fn delete_folder_only_removes_folder_but_keeps_items() {
        let conn = in_memory_db();
        let folder = create_folder(&conn, "MyFolder", 1000).expect("create folder");

        // Insert an item and assign it to the folder
        let mut item = make_item("item-in-folder", 1000);
        item.folder_id = Some(folder.id);
        let (item_id, _) = insert_item(&conn, &item).expect("insert item");

        delete_folder_only(&conn, folder.id).expect("delete_folder_only should succeed");

        // Folder should be gone
        let folders = get_folders(&conn).expect("get_folders");
        assert!(folders.is_empty(), "folder should be deleted");

        // Item should still exist with folder_id = NULL
        let folder_id_val: Option<i64> = conn
            .query_row(
                "SELECT folder_id FROM items WHERE id = ?1",
                rusqlite::params![item_id],
                |r| r.get(0),
            )
            .expect("query item");
        assert!(folder_id_val.is_none(), "item's folder_id should be cleared to NULL");
    }

    // ------------------------------------------------------------------
    // delete_folder_with_items()
    // ------------------------------------------------------------------

    #[test]
    fn delete_folder_with_items_removes_folder_and_items_returns_image_paths() {
        let conn = in_memory_db();
        let folder = create_folder(&conn, "ToDelete", 1000).expect("create folder");

        // Insert item with an image_path in the folder
        let mut item_with_image = make_item("has-image", 1000);
        item_with_image.folder_id = Some(folder.id);
        item_with_image.image_path = Some("photo.png".to_string());
        insert_item(&conn, &item_with_image).expect("insert item with image");

        // Insert item without image_path in the folder
        let mut item_no_image = make_item("no-image", 2000);
        item_no_image.folder_id = Some(folder.id);
        insert_item(&conn, &item_no_image).expect("insert item without image");

        // Insert an item NOT in the folder
        let outside_item = make_item("outside", 3000);
        let (outside_id, _) = insert_item(&conn, &outside_item).expect("insert outside item");

        let paths =
            delete_folder_with_items(&conn, folder.id).expect("delete_folder_with_items should succeed");

        // Should return only the image path (not None items)
        assert_eq!(paths, vec!["photo.png".to_string()]);

        // Folder should be deleted
        let folders = get_folders(&conn).expect("get_folders");
        assert!(folders.is_empty(), "folder should be deleted");

        // Items in the folder should be deleted
        let item_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM items WHERE folder_id = ?1",
                rusqlite::params![folder.id],
                |r| r.get(0),
            )
            .expect("count items in folder");
        assert_eq!(item_count, 0, "all items in folder should be deleted");

        // The outside item should still exist
        let outside_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM items WHERE id = ?1",
                rusqlite::params![outside_id],
                |r| r.get(0),
            )
            .expect("count outside item");
        assert_eq!(outside_count, 1, "item outside the folder should not be affected");
    }

    // ------------------------------------------------------------------
    // move_item_to_folder()
    // ------------------------------------------------------------------

    #[test]
    fn move_item_to_folder_sets_folder_id_and_clears_pinned() {
        let conn = in_memory_db();
        let folder = create_folder(&conn, "Dest", 1000).expect("create folder");

        // Insert a pinned item
        let mut item = make_item("pinned-item", 1000);
        item.pinned = true;
        let (item_id, _) = insert_item(&conn, &item).expect("insert item");

        move_item_to_folder(&conn, item_id, folder.id).expect("move_item_to_folder should succeed");

        let (folder_id_val, pinned_val): (Option<i64>, i32) = conn
            .query_row(
                "SELECT folder_id, pinned FROM items WHERE id = ?1",
                rusqlite::params![item_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .expect("query item");

        assert_eq!(folder_id_val, Some(folder.id), "folder_id should be set");
        assert_eq!(pinned_val, 0, "pinned should be forced to 0");
    }

    // ------------------------------------------------------------------
    // remove_item_from_folder()
    // ------------------------------------------------------------------

    #[test]
    fn remove_item_from_folder_clears_folder_id() {
        let conn = in_memory_db();
        let folder = create_folder(&conn, "Src", 1000).expect("create folder");

        let mut item = make_item("in-folder", 1000);
        item.folder_id = Some(folder.id);
        let (item_id, _) = insert_item(&conn, &item).expect("insert item");

        remove_item_from_folder(&conn, item_id).expect("remove_item_from_folder should succeed");

        let folder_id_val: Option<i64> = conn
            .query_row(
                "SELECT folder_id FROM items WHERE id = ?1",
                rusqlite::params![item_id],
                |r| r.get(0),
            )
            .expect("query item");
        assert!(folder_id_val.is_none(), "folder_id should be NULL after removal");
    }
}
