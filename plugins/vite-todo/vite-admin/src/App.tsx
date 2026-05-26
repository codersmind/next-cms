import { useCallback, useEffect, useState } from "react";
import { deleteTodo, listTodos, saveTodo, type TodoItem } from "./pluginApi";
import { reportPluginIframeHeight } from "./iframeResize";

export function App() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listTodos();
      rows.sort((a, b) => a.title.localeCompare(b.title));
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reportPluginIframeHeight();
  }, [items, loading, error]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const key = `todo-${Date.now()}`;
      await saveTodo({ key, title: text, done: false });
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: TodoItem) {
    setBusy(true);
    setError(null);
    try {
      await saveTodo({ ...item, done: !item.done });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(key: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteTodo(key);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>
        Vite Todo
        <span className="badge">React</span>
      </h1>
      <p className="muted">
        Built with Vite, stored via <code>/api/plugins/vite-todo/data</code>
      </p>

      {error && <p className="error">{error}</p>}

      <form onSubmit={add}>
        <input
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          Add
        </button>
      </form>

      {loading ? (
        <p className="loading">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No todos yet. Add one above.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.key} className={item.done ? "done" : ""}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => void toggle(item)}
                disabled={busy}
              />
              <span className="label" style={{ flex: 1 }}>
                {item.title}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => void remove(item.key)}
                disabled={busy}
                aria-label="Delete"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
