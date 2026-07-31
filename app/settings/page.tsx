import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SettingsPage() {
  return (
    <EmptyState>
      模块开发中
      <div style={{ marginTop: 12 }}>
        <Link href="/design-system">查看设计规范样例 → /design-system</Link>
      </div>
    </EmptyState>
  );
}
