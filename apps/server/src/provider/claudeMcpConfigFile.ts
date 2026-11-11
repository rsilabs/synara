/**
 * literati: Claude MCP config travels as a private file, not argv.
 *
 * The Agent SDK serializes non-`sdk` `mcpServers` into `--mcp-config <json>`
 * on the claude command line, where the gateway bearer (`Authorization:
 * Bearer …`) is readable by any local user through `ps`. Instead each session
 * writes its config to a 0600 file inside a 0700 directory under the Synara
 * home and passes the path. The file lives until the session's gateway lease
 * is released; leftovers from a crash are swept when the adapter starts.
 *
 * @module provider/claudeMcpConfigFile
 */
import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";

const MCP_CONFIG_FILE_PATTERN = /^[0-9a-f-]{36}\.json$/;

export function claudeMcpConfigDir(baseDir: string): string {
  return path.join(baseDir, "run", "mcp");
}

async function ensurePrivateDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  // mkdir's mode is masked by umask and skipped for existing directories.
  await fs.chmod(path.dirname(dir), 0o700);
  await fs.chmod(dir, 0o700);
}

export interface ClaudeMcpConfigFile {
  readonly path: string;
  readonly remove: () => void;
}

export async function writeClaudeMcpConfigFile(
  dir: string,
  mcpServers: Record<string, unknown>,
): Promise<ClaudeMcpConfigFile> {
  await ensurePrivateDir(dir);
  const filePath = path.join(dir, `${randomUUID()}.json`);
  // `wx` refuses to follow or reuse an existing entry; mode applies at creation.
  await fs.writeFile(filePath, JSON.stringify({ mcpServers }), { mode: 0o600, flag: "wx" });
  let removed = false;
  return {
    path: filePath,
    remove: () => {
      if (removed) return;
      removed = true;
      void fs.rm(filePath, { force: true }).catch(() => undefined);
    },
  };
}

/** Delete config files a previous server run left behind (crash, SIGKILL). */
export async function sweepClaudeMcpConfigFiles(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((entry) => MCP_CONFIG_FILE_PATTERN.test(entry))
      .map((entry) => fs.rm(path.join(dir, entry), { force: true }).catch(() => undefined)),
  );
}
