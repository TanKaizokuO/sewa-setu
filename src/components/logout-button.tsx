"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      aria-label="Logout"
      className="rounded-full p-2 text-muted-foreground hover:bg-muted"
      onClick={async () => {
        await fetch("/api/auth/login", { method: "DELETE" });
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
    </button>
  );
}
