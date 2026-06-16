import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let _granted: boolean | null = null;

export async function initNotifications() {
  _granted = await isPermissionGranted();
  if (!_granted) {
    const perm = await requestPermission();
    _granted = perm === "granted";
  }
}

export async function notify(title: string, body?: string) {
  if (_granted === null) {
    await initNotifications();
  }
  if (_granted) {
    sendNotification({ title, body });
  }
}
