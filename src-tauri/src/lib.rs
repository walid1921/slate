use tauri::{Emitter, Manager, WebviewWindow, WebviewWindowBuilder, WebviewUrl, AppHandle};


use tauri_plugin_autostart::MacosLauncher;

#[tauri::command]
fn close_quick_note(app: AppHandle) {
    if let Some(window) = app.get_webview_window("quick-note") {
        let _ = window.close();
    }
}

use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

fn show_window(window: &WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("window-shown", ());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let toggle = Shortcut::new(Some(Modifiers::ALT), Code::KeyS);
                        let new_note = Shortcut::new(Some(Modifiers::ALT), Code::KeyN);
                        if shortcut == &toggle {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.center();
                                    show_window(&window);
                                }
                            }
                        } else if shortcut == &new_note {
                            if let Some(qn) = app.get_webview_window("quick-note") {
                                if qn.is_visible().unwrap_or(false) {
                                    let _ = qn.hide();
                                } else {
                                    let _ = qn.center();
                                    let _ = qn.show();
                                    let _ = qn.set_focus();
                                }
                            } else if let Ok(qn) = WebviewWindowBuilder::new(
                                app,
                                "quick-note",
                                WebviewUrl::App("index.html?quicknote=1".into()),
                            )
                            .title("")
                            .inner_size(360.0, 200.0)
                            .decorations(false)
                            .always_on_top(true)
                            .resizable(false)
                            .transparent(true)
                            .build() {
                                #[cfg(target_os = "macos")]
                                apply_vibrancy(&qn, NSVisualEffectMaterial::HudWindow, None, Some(12.0)).ok();
                                let _ = qn.center();
                            }
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![close_quick_note])
        .setup(|app| {
            let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyS);
            app.global_shortcut().register(shortcut)?;
            let new_note_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyN);
            app.global_shortcut().register(new_note_shortcut)?;

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, Some(12.0))
                    .ok();
                let win = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = win.hide();
                    }
                });
            }


            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
