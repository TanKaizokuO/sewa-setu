"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Re-render the server page every few seconds; toast when the watched value changes. */
export function LiveRefresh({ value, messages, interval = 3000 }: { value: string; messages?: Record<string, string>; interval?: number }) {
  const router = useRouter();
  const prev = useRef(value);
  useEffect(() => {
    const id = setInterval(() => router.refresh(), interval);
    return () => clearInterval(id);
  }, [router, interval]);
  useEffect(() => {
    if (prev.current !== value) {
      const msg = messages?.[value];
      if (msg) toast.success(msg, { duration: 6000 });
      prev.current = value;
    }
  }, [value, messages]);
  return null;
}
