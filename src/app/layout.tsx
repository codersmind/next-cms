import type { Metadata } from "next";
import "./globals.css";
import { ReduxProvider } from "@/components/ReduxProvider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Next-CMS",
  description: "Strapi-like headless CMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>{children}</ReduxProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: "#27272a", color: "#fafafa", border: "1px solid #3f3f46" } }} />
      </body>
    </html>
  );
}
