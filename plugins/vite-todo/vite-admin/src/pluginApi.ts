const PLUGIN_ID = "vite-todo";
const COLLECTION = "todos";

export type TodoItem = {
  key: string;
  title: string;
  done: boolean;
  updatedAt: string;
};

function authHeaders(): HeadersInit {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  return {
    "Content-Type": "application/json",
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
}

export async function listTodos(): Promise<TodoItem[]> {
  const res = await fetch(
    `/api/plugins/${PLUGIN_ID}/data?collection=${encodeURIComponent(COLLECTION)}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("Failed to load todos");
  const json = (await res.json()) as {
    data?: { key: string; value: { title?: string; done?: boolean }; updatedAt?: string }[];
  };
  return (json.data ?? []).map((row) => ({
    key: row.key,
    title: String(row.value?.title ?? ""),
    done: !!row.value?.done,
    updatedAt: row.updatedAt ?? "",
  }));
}

export async function saveTodo(item: Omit<TodoItem, "updatedAt">): Promise<void> {
  const res = await fetch(`/api/plugins/${PLUGIN_ID}/data`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      collection: COLLECTION,
      key: item.key,
      value: { title: item.title, done: item.done },
    }),
  });
  if (!res.ok) throw new Error("Failed to save todo");
}

export async function deleteTodo(key: string): Promise<void> {
  const res = await fetch(
    `/api/plugins/${PLUGIN_ID}/data?collection=${encodeURIComponent(COLLECTION)}&key=${encodeURIComponent(key)}`,
    { method: "DELETE", headers: authHeaders() }
  );
  if (!res.ok) throw new Error("Failed to delete todo");
}
