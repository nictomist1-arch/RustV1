
use tauri_plugin_sql::{Migration, MigrationKind};

use std::path::Path;

use std::time::{
    SystemTime,
    UNIX_EPOCH,
};

use tauri::Manager;
#[cfg_attr(mobile, tauri::mobile_entry_point)]

#[tauri::command]
fn save_attachment(app: tauri::AppHandle, source: String) -> Result<String, String> {

    let source_path = Path::new(&source);

    if !source_path.is_file() {
        return Err(
            "Выбранный форман не существует"
                .to_string()
        );
    }
    let extension = source_path.
        extension()
        .and_then(
            |extension| extension.to_str()
        )
        .map(
            |extension| extension.to_ascii_lowercase()
        )
        .ok_or_else(
            ||
                "У файла нет расширения"
                    .to_string()
        )?;

    let allowed_extensions = [
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
    ];

    if !allowed_extensions
        .contains(
            &extension.as_str()
        )
    {
        return Err(
            "Этот формат изображения не поддерживается"
                .to_string()
        );
    }

    let app_data_dir =
        app
            .path()
            .app_data_dir()
            .map_err(
                |error|
                    error.to_string()
            )?;


    let attachments_dir =
        app_data_dir
            .join("attachments");


    std::fs::create_dir_all(
        &attachments_dir
    )
        .map_err(
            |error|
                error.to_string()
        )?;

    let timestamp =
        SystemTime::now()

            .duration_since(
                UNIX_EPOCH
            )
            .map_err(
                |error|
                    error.to_string()
            )?
            .as_nanos();

    let file_name =
    format!(
        "image_{}.{}",
        timestamp,
        extension,
    );

    let destination =
        attachments_dir
            .join(&file_name);

    std::fs::copy(
        source_path,
        &destination,
    )
        .map_err(
            |error|
                error.to_string()
        )?;

    let saved_path =
        destination
            .to_str()

            .ok_or_else(
                ||
                    "Не удалось преобразовать путь файла"
                        .to_string()
            )?

            .to_string();

    Ok(saved_path)
}


pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,

            description: "create_message_table",

            sql: include_str!("../migrations/0001_initial.sql"),

            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_chats",
            sql: include_str!("../migrations/0002_chats.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "message_attachments",
            sql: include_str!("../migrations/0003_message_attachments.sql"),
            kind: MigrationKind::Up,
        },
        Migration{
            version: 4,
            description: "create_users_and_link_messages",
            sql: include_str!("../migrations/0004_users.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "message_edited_at",
            sql: include_str!("../migrations/0005_message_edited_at.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "chat_participants",
            sql: include_str!("../migrations/0006_chat_participants.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "channels",
            sql: include_str!("../migrations/0007_channels.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "post_comments",
            sql: include_str!("../migrations/0008_post_comments.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "user_passwords",
            sql: include_str!("../migrations/0009_user_passwords.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:messenger.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                save_attachment
            ]
        )
        .run(tauri::generate_context!())
        .expect("Ошиюка при сборке приложения");
}
