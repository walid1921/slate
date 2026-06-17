use tauri::{Emitter, Manager, WebviewWindow, WebviewWindowBuilder, WebviewUrl};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

fn show_window(window: &WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("window-shown", ());
}

fn toggle_window(window: &WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        show_window(window);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let toggle = Shortcut::new(Some(Modifiers::ALT), Code::KeyS);
                        let new_note = Shortcut::new(Some(Modifiers::ALT), Code::KeyN);
                        if shortcut == &toggle {
                            if let Some(window) = app.get_webview_window("main") {
                                toggle_window(&window);
                            }
                        } else if shortcut == &new_note {
                            if let Some(qn) = app.get_webview_window("quick-note") {
                                if qn.is_visible().unwrap_or(false) {
                                    let _ = qn.emit("quick-note-blur", ());
                                } else {
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

                                let qn_win = qn.clone();
                                qn.on_window_event(move |event| {
                                    if let tauri::WindowEvent::Focused(false) = event {
                                        let _ = qn_win.emit("quick-note-blur", ());
                                    }
                                });
                            }
                        }
                    }
                })
                .build(),
        )
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
