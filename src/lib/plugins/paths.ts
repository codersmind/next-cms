import path from "path";

export function getPluginsRoot(): string {
  const env = process.env.PLUGINS_DIR?.trim();
  if (env) return path.isAbsolute(env) ? env : path.join(process.cwd(), env);
  return path.join(process.cwd(), "plugins");
}

export function getPluginDir(installPath: string): string {
  return path.join(getPluginsRoot(), installPath);
}

export function pluginPermission(pluginId: string): string {
  return `plugin.${pluginId}.use`;
}
