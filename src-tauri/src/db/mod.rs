mod folders;
mod items;
mod schema;
mod types;
#[cfg(test)]
mod tests;

pub use folders::*;
pub use items::*;
pub use schema::*;
pub use types::*;

use rusqlite::Connection;
use std::sync::{Arc, Mutex};

pub const MAX_HISTORY: u32 = 500;
pub type DbState = Arc<Mutex<Connection>>;
