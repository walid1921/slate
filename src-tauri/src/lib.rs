use tauri::{Emitter, Manager, WebviewWindow, WebviewWindowBuilder, WebviewUrl, AppHandle};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};


use tauri_plugin_autostart::MacosLauncher;

struct AutoHide(Arc<AtomicBool>);

#[tauri::command]
fn set_auto_hide(state: tauri::State<AutoHide>, enabled: bool) {
    state.0.store(enabled, Ordering::Relaxed);
}

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state_id: i32, event_type: u32) -> f64;
    fn CGMainDisplayID() -> u32;
    fn CGDisplayIsAsleep(display: u32) -> i32;
}

#[tauri::command]
fn get_idle_seconds() -> f64 {
    #[cfg(target_os = "macos")]
    {
        // kCGEventSourceStateCombinedSessionState = 0; kCGAnyInputEventType = u32::MAX
        unsafe { CGEventSourceSecondsSinceLastEventType(0, u32::MAX) }
    }
    #[cfg(not(target_os = "macos"))]
    {
        0.0
    }
}

#[tauri::command]
fn is_display_asleep() -> bool {
    #[cfg(target_os = "macos")]
    {
        unsafe { CGDisplayIsAsleep(CGMainDisplayID()) != 0 }
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

#[tauri::command]
fn close_quick_note(app: AppHandle) {
    if let Some(window) = app.get_webview_window("quick-note") {
        let _ = window.close();
    }
}

#[tauri::command]
fn show_reminder_overlay(app: AppHandle, text: String) {
    if let Some(existing) = app.get_webview_window("reminder-overlay") {
        let _ = existing.close();
    }
    let url = format!("index.html?reminderOverlay=1&text={}", urlencoding::encode(&text));
    if let Ok(win) = WebviewWindowBuilder::new(
        &app,
        "reminder-overlay",
        WebviewUrl::App(url.into()),
    )
    .fullscreen(true)
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(true)
    .build() {
        let _ = win.set_focus();
    }
}

#[tauri::command]
fn close_reminder_overlay(app: AppHandle) {
    if let Some(window) = app.get_webview_window("reminder-overlay") {
        let _ = window.close();
    }
}

use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

fn show_window(window: &WebviewWindow) {
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 920.0, height: 680.0 }));
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("window-shown", ());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AutoHide(Arc::new(AtomicBool::new(true))))
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
        .invoke_handler(tauri::generate_handler![close_quick_note, set_auto_hide, show_reminder_overlay, close_reminder_overlay, get_idle_seconds, is_display_asleep])
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
                let auto_hide_flag = app.state::<AutoHide>().0.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        if auto_hide_flag.load(Ordering::Relaxed) { let _ = win.hide(); }
                    }
                });
            }


            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
