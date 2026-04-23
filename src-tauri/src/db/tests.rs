use super::*;

/// Build an in-memory database with the full schema applied.
fn in_memory_db() -> rusqlite::Connection {
    // SQLite treats ":memory:" as a special in-memory database.
    open(std::path::Path::new(":memory:")).expect("failed to open in-memory DB")
}

/// Construct a minimal ClipboardItem for testing.
fn make_item(text: &str, created_at: i64, pinned: bool) -> ClipboardItem {
    ClipboardItem {
        id: 0,
        kind: "text".to_string(),
        text: Some(text.to_string()),
        html: None,
        rtf: None,
        image_path: None,
        source_app: None,
        created_at,
        pinned,
        folder_id: None,
        qr_text: None,
        image_width: None,
        image_height: None,
    }
}

// ------------------------------------------------------------------
// open()
// ------------------------------------------------------------------

#[test]
fn open_creates_items_table() {
    let conn = in_memory_db();
    // If the table exists, this query returns without error.
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM items", [], |r| r.get(0))
        .expect("items table should exist after open()");
    assert_eq!(count, 0);
}

// ------------------------------------------------------------------
// insert_item()
// ------------------------------------------------------------------

#[test]
fn insert_returns_positive_rowid() {
    let conn = in_memory_db();
    let item = make_item("hello", 1_000_000, false);
    let (id, _) = insert_item(&conn, &item).expect("insert should succeed");
    assert!(id > 0, "rowid must be positive, got {id}");
}

#[test]
fn insert_roundtrips_all_fields() {
    let conn = in_memory_db();
    let mut item = make_item("round-trip text", 9_999, false);
    item.html = Some("<b>bold</b>".to_string());
    item.rtf = Some("{\\rtf1}".to_string());
    item.source_app = Some("com.example.app".to_string());
    item.folder_id = Some(42);

    let (id, _) = insert_item(&conn, &item).expect("insert should succeed");

    let rows = get_history(&conn, 1).expect("get_history should succeed");
    assert_eq!(rows.len(), 1);
    let saved = &rows[0];
    assert_eq!(saved.id, id);
    assert_eq!(saved.kind, "text");
    assert_eq!(saved.text.as_deref(), Some("round-trip text"));
    assert_eq!(saved.html.as_deref(), Some("<b>bold</b>"));
    assert_eq!(saved.rtf.as_deref(), Some("{\\rtf1}"));
    assert_eq!(saved.source_app.as_deref(), Some("com.example.app"));
    assert_eq!(saved.created_at, 9_999);
    assert!(!saved.pinned);
    assert_eq!(saved.folder_id, Some(42));
}

#[test]
fn insert_persists_pinned_flag() {
    let conn = in_memory_db();
    let item = make_item("pinned entry", 1_000, true);
    insert_item(&conn, &item).expect("insert should succeed");

    let rows = get_history(&conn, 10).expect("get_history should succeed");
    assert_eq!(rows.len(), 1);
    assert!(rows[0].pinned, "pinned flag must round-trip as true");
}

#[test]
fn insert_returns_evicted_image_paths() {
    let conn = in_memory_db();

    // Insert the image item with the lowest timestamp so it is the oldest.
    let mut oldest = make_item("oldest-with-image", 0, false);
    oldest.image_path = Some("evicted.png".to_string());
    insert_item(&conn, &oldest).unwrap();

    // Insert MAX_HISTORY - 1 more items at higher timestamps (total = MAX_HISTORY).
    // No eviction happens yet — we are exactly at the cap.
    for i in 1..MAX_HISTORY as i64 {
        insert_item(&conn, &make_item(&format!("item-{i}"), i * 1000, false)).unwrap();
    }

    // Confirm we are exactly at the cap with no eviction so far.
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM items", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, MAX_HISTORY as i64, "should be at cap before trigger insert");

    // The trigger insert is the (MAX_HISTORY + 1)th item; it should evict oldest-with-image.
    let (_, evicted) = insert_item(
        &conn,
        &make_item("trigger", MAX_HISTORY as i64 * 1000, false),
    )
    .unwrap();

    assert!(
        evicted.contains(&"evicted.png".to_string()),
        "evicted image paths must be returned; got: {evicted:?}"
    );
}

// ------------------------------------------------------------------
// get_history()
// ------------------------------------------------------------------

#[test]
fn get_history_returns_newest_first() {
    let conn = in_memory_db();
    insert_item(&conn, &make_item("older", 1_000, false)).unwrap();
    insert_item(&conn, &make_item("newer", 2_000, false)).unwrap();

    let rows = get_history(&conn, 10).expect("get_history should succeed");
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].text.as_deref(), Some("newer"), "first row must be newest");
    assert_eq!(rows[1].text.as_deref(), Some("older"));
}

#[test]
fn get_history_respects_limit() {
    let conn = in_memory_db();
    for i in 0..5_i64 {
        insert_item(&conn, &make_item(&format!("item-{i}"), i * 1_000, false)).unwrap();
    }

    let rows = get_history(&conn, 3).expect("get_history should succeed");
    assert_eq!(rows.len(), 3, "only 3 rows should be returned when limit is 3");
}

#[test]
fn get_history_empty_returns_empty_vec() {
    let conn = in_memory_db();
    let rows = get_history(&conn, 50).expect("get_history should succeed");
    assert!(rows.is_empty());
}

// ------------------------------------------------------------------
// Eviction (MAX_HISTORY = 500)
// ------------------------------------------------------------------

#[test]
fn eviction_removes_oldest_unpinned_on_501st_insert() {
    let conn = in_memory_db();

    // Insert 500 non-pinned items with ascending timestamps so item 0 is oldest.
    for i in 0..500_i64 {
        insert_item(&conn, &make_item(&format!("item-{i}"), i, false)).unwrap();
    }

    // Confirm 500 rows exist before the eviction-triggering insert.
    let count_before: i64 = conn
        .query_row("SELECT COUNT(*) FROM items", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count_before, 500);

    // The 501st insert must evict item-0 (created_at = 0, oldest).
    insert_item(&conn, &make_item("item-500", 500, false)).unwrap();

    let count_after: i64 = conn
        .query_row("SELECT COUNT(*) FROM items", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count_after, 500, "total should remain capped at 500");

    // item-0 should be gone.
    let oldest_ts: Option<i64> = conn
        .query_row(
            "SELECT MIN(created_at) FROM items WHERE pinned = 0",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_ne!(
        oldest_ts,
        Some(0),
        "created_at=0 (item-0) must have been evicted"
    );
}

#[test]
fn eviction_does_not_remove_pinned_items() {
    let conn = in_memory_db();

    // Insert 1 pinned item with the oldest timestamp.
    insert_item(&conn, &make_item("pinned-anchor", 0, true)).unwrap();

    // Fill up 500 non-pinned items; each subsequent insert triggers the eviction query.
    for i in 1..=500_i64 {
        insert_item(&conn, &make_item(&format!("unpinned-{i}"), i, false)).unwrap();
    }

    // The pinned item must still be present.
    let pinned_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM items WHERE pinned = 1", [], |r| r.get(0))
        .unwrap();
    assert_eq!(pinned_count, 1, "pinned item must survive eviction");

    // Total = 501: 500 non-pinned + 1 pinned (pinned items are exempt from the cap).
    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM items", [], |r| r.get(0))
        .unwrap();
    assert_eq!(
        total, 501,
        "pinned items are excluded from the cap, so total should be 501"
    );
}

#[test]
fn multiple_evictions_keep_count_at_cap() {
    let conn = in_memory_db();

    // Insert 600 items; after each insert beyond 500, the oldest should be trimmed.
    for i in 0..600_i64 {
        insert_item(&conn, &make_item(&format!("item-{i}"), i, false)).unwrap();
    }

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM items", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 500, "count must remain capped at 500 after 600 inserts");
}

// ------------------------------------------------------------------
// insert_item_formats() / get_item_formats()
// ------------------------------------------------------------------

#[test]
fn insert_and_get_item_formats_round_trip() {
    let conn = in_memory_db();
    let (id, _) = insert_item(&conn, &make_item("hello", 1_000, false)).unwrap();

    let formats = vec![
        ("public.rtf".to_string(), b"rtf-bytes".to_vec()),
        ("public.html".to_string(), b"<b>html</b>".to_vec()),
    ];
    insert_item_formats(&conn, id, &formats).expect("insert_item_formats should succeed");

    let retrieved = get_item_formats(&conn, id).expect("get_item_formats should succeed");
    // Results are ordered by format_type (alphabetical), so html < rtf.
    assert_eq!(retrieved.len(), 2);
    assert_eq!(retrieved[0].0, "public.html");
    assert_eq!(retrieved[0].1, b"<b>html</b>".to_vec());
    assert_eq!(retrieved[1].0, "public.rtf");
    assert_eq!(retrieved[1].1, b"rtf-bytes".to_vec());
}

#[test]
fn get_item_formats_returns_empty_for_unknown_item_id() {
    let conn = in_memory_db();
    let result = get_item_formats(&conn, 9999).expect("get_item_formats should succeed");
    assert!(result.is_empty(), "unknown item_id should return empty vec");
}

#[test]
fn insert_item_formats_empty_slice_is_noop() {
    let conn = in_memory_db();
    let (id, _) = insert_item(&conn, &make_item("hello", 1_000, false)).unwrap();

    insert_item_formats(&conn, id, &[]).expect("empty insert should succeed");

    let result = get_item_formats(&conn, id).expect("get_item_formats should succeed");
    assert!(result.is_empty(), "no formats should have been inserted");
}

#[test]
fn cascade_delete_removes_item_formats() {
    let conn = in_memory_db();
    // Enable foreign key enforcement for this connection.
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();

    let (id, _) = insert_item(&conn, &make_item("hello", 1_000, false)).unwrap();
    let formats = vec![("public.utf8-plain-text".to_string(), b"hello".to_vec())];
    insert_item_formats(&conn, id, &formats).unwrap();

    // Verify the format row was inserted.
    let before = get_item_formats(&conn, id).unwrap();
    assert_eq!(before.len(), 1);

    // Delete the parent item.
    delete_item(&conn, id).unwrap();

    // The format row should have been cascade-deleted.
    let after = get_item_formats(&conn, id).unwrap();
    assert!(after.is_empty(), "formats should be cascade-deleted with the item");
}

// ------------------------------------------------------------------
// touch_item()
// ------------------------------------------------------------------

#[test]
fn touch_item_updates_created_at_and_returns_updated_row() {
    let conn = in_memory_db();
    let item = make_item("hello", 1_000, false);
    let (id, _) = insert_item(&conn, &item).expect("insert should succeed");

    let updated = touch_item(&conn, id, 9_999).expect("touch_item should succeed");
    assert_eq!(updated.id, id);
    assert_eq!(updated.created_at, 9_999, "created_at must be updated to the new timestamp");
    assert_eq!(updated.text.as_deref(), Some("hello"), "other fields must be preserved");
}

#[test]
fn touch_item_nonexistent_id_returns_error() {
    let conn = in_memory_db();
    let result = touch_item(&conn, 9999, 1_000);
    assert!(result.is_err(), "touch_item on a missing id must return Err");
}

// ------------------------------------------------------------------
// clear_history()
// ------------------------------------------------------------------

#[test]
fn clear_history_deletes_unpinned_and_returns_image_paths() {
    let conn = in_memory_db();

    // Insert a pinned item (should survive)
    let pinned = make_item("pinned", 1_000, true);
    insert_item(&conn, &pinned).expect("insert pinned item");

    // Insert an unpinned item with an image_path
    let mut with_image = make_item("with-image", 2_000, false);
    with_image.image_path = Some("img.png".to_string());
    insert_item(&conn, &with_image).expect("insert item with image");

    // Insert an unpinned text-only item (no image_path)
    let text_only = make_item("text-only", 3_000, false);
    insert_item(&conn, &text_only).expect("insert text-only item");

    let paths = clear_history(&conn).expect("clear_history should succeed");

    // Only the image-bearing item's path should be returned
    assert_eq!(paths, vec!["img.png".to_string()]);

    // Pinned item must survive
    let rows = get_history(&conn, 50).expect("get_history");
    assert_eq!(rows.len(), 1, "only the pinned item should remain");
    assert!(rows[0].pinned, "surviving item must be pinned");
}

#[test]
fn clear_history_text_only_item_not_in_returned_paths() {
    let conn = in_memory_db();
    let text_only = make_item("plain-text", 1_000, false);
    insert_item(&conn, &text_only).expect("insert text-only item");

    let paths = clear_history(&conn).expect("clear_history should succeed");
    assert!(paths.is_empty(), "text-only items should not appear in returned paths");
}

// ------------------------------------------------------------------
// delete_item_with_path()
// ------------------------------------------------------------------

#[test]
fn delete_item_with_path_returns_path_when_present() {
    let conn = in_memory_db();
    let mut item = make_item("img-item", 1_000, false);
    item.image_path = Some("42.png".to_string());
    let (id, _) = insert_item(&conn, &item).expect("insert item");

    let path = delete_item_with_path(&conn, id).expect("delete_item_with_path should succeed");
    assert_eq!(path, Some("42.png".to_string()));

    // Item should be deleted
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM items WHERE id = ?1", [id], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 0, "item should be deleted");
}

#[test]
fn delete_item_with_path_returns_none_when_no_image_path() {
    let conn = in_memory_db();
    let item = make_item("no-image", 1_000, false);
    let (id, _) = insert_item(&conn, &item).expect("insert item");

    let path = delete_item_with_path(&conn, id).expect("delete_item_with_path should succeed");
    assert!(path.is_none(), "should return None when image_path is NULL");
}

#[test]
fn delete_item_with_path_returns_none_for_nonexistent_id() {
    let conn = in_memory_db();
    let path = delete_item_with_path(&conn, 9999).expect("delete_item_with_path should succeed even for missing id");
    assert!(path.is_none(), "should return None when id doesn't exist");
}

// ------------------------------------------------------------------
// pin_item() / unpin_item()
// ------------------------------------------------------------------

#[test]
fn pin_item_sets_pinned_and_clears_folder_id() {
    let conn = in_memory_db();
    // Insert item with a folder_id set directly via SQL (bypass insert_item validation)
    let mut item = make_item("in-folder", 1_000, false);
    item.folder_id = Some(42);
    let (id, _) = insert_item(&conn, &item).expect("insert item");

    pin_item(&conn, id).expect("pin_item should succeed");

    let rows = get_history(&conn, 10).expect("get_history");
    let saved = rows.iter().find(|r| r.id == id).expect("item should exist");
    assert!(saved.pinned, "pinned should be set to true");
    assert!(saved.folder_id.is_none(), "folder_id should be cleared to NULL when pinned");
}

#[test]
fn unpin_item_clears_pinned_flag() {
    let conn = in_memory_db();
    let item = make_item("pinned-item", 1_000, true);
    let (id, _) = insert_item(&conn, &item).expect("insert item");

    unpin_item(&conn, id).expect("unpin_item should succeed");

    let rows = get_history(&conn, 10).expect("get_history");
    let saved = rows.iter().find(|r| r.id == id).expect("item should exist");
    assert!(!saved.pinned, "pinned should be cleared to false");
}

// ------------------------------------------------------------------
// update_qr_text()
// ------------------------------------------------------------------

#[test]
fn update_qr_text_sets_qr_text_on_item() {
    let conn = in_memory_db();
    let item = make_item("qr-item", 1_000, false);
    let (id, _) = insert_item(&conn, &item).expect("insert item");

    update_qr_text(&conn, id, "https://example.com").expect("update_qr_text should succeed");

    let rows = get_history(&conn, 10).expect("get_history");
    let saved = rows.iter().find(|r| r.id == id).expect("item should exist");
    assert_eq!(saved.qr_text.as_deref(), Some("https://example.com"));
}

// ------------------------------------------------------------------
// get_item_texts()
// ------------------------------------------------------------------

#[test]
fn get_item_texts_returns_empty_for_empty_input() {
    let conn = in_memory_db();
    let result = get_item_texts(&conn, &[]).expect("get_item_texts should succeed");
    assert!(result.is_empty(), "empty input should return empty vec");
}

#[test]
fn get_item_texts_returns_texts_in_input_order() {
    let conn = in_memory_db();
    let (id1, _) = insert_item(&conn, &make_item("first", 1_000, false)).expect("insert first");
    let (id2, _) = insert_item(&conn, &make_item("second", 2_000, false)).expect("insert second");
    let (id3, _) = insert_item(&conn, &make_item("third", 3_000, false)).expect("insert third");

    // Request in reverse order
    let result = get_item_texts(&conn, &[id3, id1, id2]).expect("get_item_texts should succeed");
    assert_eq!(result, vec!["third", "first", "second"]);
}

#[test]
fn get_item_texts_skips_nonexistent_ids() {
    let conn = in_memory_db();
    let (id, _) = insert_item(&conn, &make_item("exists", 1_000, false)).expect("insert item");

    let result = get_item_texts(&conn, &[id, 9999]).expect("get_item_texts should succeed");
    assert_eq!(result, vec!["exists"]);
}

#[test]
fn get_item_texts_skips_items_with_null_text() {
    let conn = in_memory_db();
    // Insert an item with NULL text directly via SQL
    conn.execute(
        "INSERT INTO items (kind, text, created_at, pinned) VALUES ('image', NULL, 1000, 0)",
        [],
    )
    .expect("insert image item");
    let null_id = conn.last_insert_rowid();

    let (text_id, _) =
        insert_item(&conn, &make_item("has-text", 2_000, false)).expect("insert text item");

    let result = get_item_texts(&conn, &[null_id, text_id]).expect("get_item_texts should succeed");
    assert_eq!(result, vec!["has-text"], "NULL-text item should be skipped");
}

#[test]
fn get_item_texts_skips_items_with_empty_text() {
    let conn = in_memory_db();
    conn.execute(
        "INSERT INTO items (kind, text, created_at, pinned) VALUES ('text', '', 1000, 0)",
        [],
    )
    .expect("insert empty-text item");
    let empty_id = conn.last_insert_rowid();

    let result = get_item_texts(&conn, &[empty_id]).expect("get_item_texts should succeed");
    assert!(result.is_empty(), "empty-text item should be skipped");
}
