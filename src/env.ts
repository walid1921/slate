import { appDataDir, homeDir, join } from "@tauri-apps/api/path";
import { mkdir, exists, readDir, rename, remove } from "@tauri-apps/plugin-fs";

export const envName: "dev" | "prod" = import.meta.env.DEV ? "dev" : "prod";

let _envDir: string | null = null;

export async function getEnvDir(): Promise<string> {
  if (_envDir) return _envDir;
  if (envName === "dev") {
    const home = await homeDir();
    _envDir = await join(home, "Library", "Application Support", "slate-db-dev");
  } else {
    _envDir = await appDataDir();
    await migrateProdLayoutIfNeeded(_envDir);
  }
  await mkdir(_envDir, { recursive: true });
  return _envDir;
}

async function migrateProdLayoutIfNeeded(appData: string): Promise<void> {
  const oldDir = await join(appData, "prod");
  const newDb = await join(appData, "slate.db");
  try {
    if (!(await exists(oldDir))) return;
    if (await exists(newDb)) return;
    const entries = await readDir(oldDir);
    for (const e of entries) {
      const src = await join(oldDir, e.name);
      const dst = await join(appData, e.name);
      await rename(src, dst);
    }
    await remove(oldDir, { recursive: true });
  } catch (err) {
    console.error("Prod layout migration failed:", err);
  }
}
