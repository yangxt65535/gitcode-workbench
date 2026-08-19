"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_APP_PATH } from "@/lib/app/homePath";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(DEFAULT_APP_PATH);
  }, [router]);
  return null;
}
