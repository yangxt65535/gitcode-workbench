import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { AuthProvider } from "@/lib/auth/AuthContext";
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
        <AuthProvider>
          <WorkspaceProvider>
            <AppShell>{children}</AppShell>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
