import { join, resolve } from "node:path";

export function resolveWorkspacePath(workspace?: string): string {
  return resolve(workspace || process.cwd());
}

export function contextDirectory(workspace: string): string {
  return join(workspace, ".ellygent");
}
