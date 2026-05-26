export const PLUGIN_ID_REGEX = /^[a-z][a-z0-9-]{1,48}$/;

export type PluginAdminPageType =
  | "readme"
  | "settings"
  | "collection"
  | "email-send"
  | "html";

export interface PluginAdminPage {
  slug: string;
  title: string;
  type: PluginAdminPageType;
  /** settings page: storage key */
  settingsKey?: string;
  /** collection page */
  collection?: string;
  fields?: { name: string; label: string; type: "text" | "textarea" | "richtext" }[];
  /** html page: file under admin/ */
  htmlFile?: string;
  /** readme page: markdown file (default README.md at plugin root, or e.g. admin/guide.md) */
  readmeFile?: string;
}

/** Declarative automation — defined in each plugin's plugin.json (not hardcoded in CMS). */
export interface PluginAutomation {
  id: string;
  label: string;
  description?: string;
  /** Suggested outbound webhook filter (author configures content type in admin). */
  trigger?: {
    event: string;
    contentTypes?: string[];
  };
  action: {
    handler: string;
    options?: Record<string, unknown>;
  };
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  minCmsVersion?: string;
  permissions?: string[];
  capabilities?: ("email" | "storage" | "settings")[];
  admin: {
    menu: { label: string; icon?: string; order?: number };
    pages: PluginAdminPage[];
  };
  settings?: {
    [key: string]: {
      label: string;
      fields: { name: string; label: string; type: string; required?: boolean; default?: unknown }[];
    };
  };
  /** Optional webhook automations shipped with the plugin (fully dynamic per plugin). */
  automations?: PluginAutomation[];
}

export interface InstalledPlugin {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  enabled: boolean;
  manifest: PluginManifest;
  installPath: string;
  createdAt: string;
  updatedAt: string;
}
