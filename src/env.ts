import { existsSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

export function loadLocalEnv(cwd: string): void {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(cwd, fileName);
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false, quiet: true });
    }
  }
}
