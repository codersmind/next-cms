"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (isLogin) {
      setOk(true);
      return;
    }
    const jwt =
      typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
    if (!jwt) {
      router.replace("/admin/login");
      return;
    }
    setOk(true);
  }, [isLogin, router]);

  if (ok === null && !isLogin) {
    return (
      <div className="p-8 text-center text-muted">Loading…</div>
    );
  }
  return <>{children}</>;
}
