import Link from "next/link";
import { LayoutDashboard, Boxes, FileText, Image, ArrowRight } from "lucide-react";

const cards = [
  {
    href: "/admin/content-type-builder",
    icon: Boxes,
    title: "Content-Type Builder",
    description: "Create collection types, single types, and use templates.",
  },
  {
    href: "/admin/content-manager",
    icon: FileText,
    title: "Content Manager",
    description: "Create and edit entries for your content types.",
  },
  {
    href: "/admin/media-library",
    icon: Image,
    title: "Media Library",
    description: "Upload and manage images and files.",
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
          <LayoutDashboard className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Welcome to Next-CMS. Create content types and manage content.
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex items-start gap-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors group"
            >
              <div className="w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-600/20 transition-colors">
                <Icon className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-white block">{card.title}</span>
                <p className="mt-1 text-sm text-zinc-500">{card.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-400 group-hover:gap-2 transition-all">
                  Open
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
