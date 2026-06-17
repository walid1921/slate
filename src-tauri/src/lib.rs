use tauri::{Emitter, Manager, WebviewWindow, WebviewWindowBuilder, WebviewUrl, AppHandle};

#[cfg(target_os = "macos")]
fn set_fullscreen_overlay(window: &WebviewWindow) {
    use objc2::runtime::AnyObject;
    use objc2::msg_send;
    if let Ok(ns_window) = window.ns_window() {
        unsafe {
            let win = ns_window as *mut AnyObject;
            // NSPopUpMenuWindowLevel (101) — floats above fullscreen spaces like Raycast
            let _: () = msg_send![win, setLevel: 101i64];
            // CanJoinAllSpaces | Transient (no FullScreenAuxiliary — that causes split-view)
            let behavior: u64 = (1 << 0) | (1 << 2);
            let _: () = msg_send![win, setCollectionBehavior: behavior];
        }
    }
}

#[cfg(target_os = "macos")]
fn cg_cursor_position() -> Option<(f64, f64)> {
    #[repr(C)]
    struct CGPoint { x: f64, y: f64 }
    extern "C" {
        fn CGEventCreate(source: *const std::ffi::c_void) -> *mut std::ffi::c_void;
        fn CGEventGetLocation(event: *mut std::ffi::c_void) -> CGPoint;
        fn CFRelease(cf: *mut std::ffi::c_void);
    }
    unsafe {
        let ev = CGEventCreate(std::ptr::null());
        if ev.is_null() { return None; }
        let pt = CGEventGetLocation(ev);
        CFRelease(ev);
        Some((pt.x, pt.y))
    }
}

fn center_on_cursor_screen(window: &WebviewWindow, _app: &AppHandle) {
    #[cfg(target_os = "macos")]
    let cursor = cg_cursor_position();
    #[cfg(not(target_os = "macos"))]
    let cursor: Option<(f64, f64)> = None;

    let Ok(monitors) = window.available_monitors() else {
        let _ = window.center();
        return;
    };
    let (win_w, win_h) = window.inner_size()
        .ok()
        .map(|s| {
            let scale = window.scale_factor().unwrap_or(1.0);
            (s.width as f64 / scale, s.height as f64 / scale)
        })
        .unwrap_or((640.0, 520.0));
    if let Some((cx, cy)) = cursor {
        for monitor in monitors {
            let pos = monitor.position();
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let mx = pos.x as f64;
            let my = pos.y as f64;
            let mw = size.width as f64;
            let mh = size.height as f64;
            // CG coords are top-left physical; Tauri monitor coords are also top-left physical
            if cx >= mx && cx < mx + mw && cy >= my && cy < my + mh {
                let ww = win_w * scale;
                let wh = win_h * scale;
                let x = mx + (mw - ww) / 2.0;
                let y = my + (mh - wh) / 2.0;
                let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                return;
            }
        }
    }
    let _ = window.center();
}

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
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    #[cfg(target_os = "macos")]
                                    set_fullscreen_overlay(&window);
                                    center_on_cursor_screen(&window, app);
                                    show_window(&window);
                                }
                            }
                        } else if shortcut == &new_note {
                            if let Some(qn) = app.get_webview_window("quick-note") {
                                if qn.is_visible().unwrap_or(false) {
                                    let _ = qn.hide();
                                } else {
                                    #[cfg(target_os = "macos")]
                                    set_fullscreen_overlay(&qn);
                                    center_on_cursor_screen(&qn, app);
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
                                #[cfg(target_os = "macos")]
                                set_fullscreen_overlay(&qn);
                                center_on_cursor_screen(&qn, app);
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
                #[cfg(target_os = "macos")]
                set_fullscreen_overlay(&window);
                center_on_cursor_screen(&window, app.handle());
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
