"use client";

import { useEffect } from "react";

/** Mark notifications as read a few seconds after the citizen has seen them. */
export function MarkRead() {
  useEffect(() => {
    const id = setTimeout(() => fetch("/api/notifications/read", { method: "POST" }), 4000);
    return () => clearTimeout(id);
  }, []);
  return null;
}
