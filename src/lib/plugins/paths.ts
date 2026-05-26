import path from "path";
import { PLUGIN_ID_REGEX } from "./types";

export function getPluginsRoot(): string {
  const env = process.env.PLUGINS_DIR?.trim();
  if (env) return path.isAbsolute(env) ? env : path.join(process.cwd(), env);
  return path.join(process.cwd(), "plugins");
}

export function assertValidPluginInstallPath(installPath: string): void {
  if (!PLUGIN_ID_REGEX.test(installPath)) {
    throw new Error("Invalid plugin install path");
  }
}

export function getPluginDir(installPath: string): string {
  assertValidPluginInstallPath(installPath);
  return path.join(getPluginsRoot(), installPath);
}

export function pluginPermission(pluginId: string): string {
  return `plugin.${pluginId}.use`;
}
