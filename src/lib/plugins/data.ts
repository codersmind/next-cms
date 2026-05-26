import { prisma } from "../prisma";

export async function listPluginData(
  pluginDbId: string,
  collection: string
): Promise<{ key: string; value: unknown; updatedAt: string }[]> {
  const rows = await prisma.pluginData.findMany({
    where: { pluginId: pluginDbId, collection },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    key: r.key,
    value: JSON.parse(r.value) as unknown,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getPluginData(
  pluginDbId: string,
  collection: string,
  key: string
): Promise<unknown | null> {
  const row = await prisma.pluginData.findUnique({
    where: {
      pluginId_collection_key: { pluginId: pluginDbId, collection, key },
    },
  });
  if (!row) return null;
  return JSON.parse(row.value) as unknown;
}

export async function setPluginData(
  pluginDbId: string,
  collection: string,
  key: string,
  value: unknown
): Promise<void> {
  const valueStr = JSON.stringify(value);
  await prisma.pluginData.upsert({
    where: {
      pluginId_collection_key: { pluginId: pluginDbId, collection, key },
    },
    create: { pluginId: pluginDbId, collection, key, value: valueStr },
    update: { value: valueStr },
  });
}

export async function deletePluginData(
  pluginDbId: string,
  collection: string,
  key: string
): Promise<void> {
  await prisma.pluginData.deleteMany({
    where: { pluginId: pluginDbId, collection, key },
  });
}
