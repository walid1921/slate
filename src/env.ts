import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir } from "@tauri-apps/plugin-fs";

export const envName = import.meta.env.DEV ? "dev" : "prod";

let _envDir: string | null = null;
export async function getEnvDir(): Promise<string> {
  if (_envDir) return _envDir;
  const dir = await join(await appDataDir(), envName);
  await mkdir(dir, { recursive: true });
  _envDir = dir;
  return dir;
}
