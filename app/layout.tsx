import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { WorkspaceProvider } from "@/lib/workspace/WorkspaceContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitCode 工作台",
  description: "GitCode workbench SPA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
