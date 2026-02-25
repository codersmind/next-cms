import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Next-CMS</h1>
      <p className="text-muted mb-8">
        Strapi-like headless CMS with dynamic content types, REST API, and admin
        panel.
      </p>
      <ul className="list-none space-y-2">
        <li>
          <Link href="/admin" className="text-accent hover:underline">
            → Admin panel
          </Link>{" "}
          (Content-Type Builder, Content Manager, Media Library)
        </li>
        <li>
          <strong>REST API:</strong>{" "}
          <code className="bg-surface px-1.5 py-0.5 rounded text-sm">
            GET/POST /api/:pluralId
          </code>
          ,{" "}
          <code className="bg-surface px-1.5 py-0.5 rounded text-sm">
            GET/PUT/DELETE /api/:pluralId/:documentId
          </code>
        </li>
        <li>
          <strong>Auth:</strong>{" "}
          <code className="bg-surface px-1.5 py-0.5 rounded text-sm">
            POST /api/auth/login
          </code>{" "}
          (body: identifier, password)
        </li>
      </ul>
    </main>
  );
}
