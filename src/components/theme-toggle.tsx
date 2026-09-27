"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useLang } from "./lang-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { tt } = useLang();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={tt("Toggle dark mode", "डार्क मोड बदलें")}
    >
      {/* both icons render; CSS picks one so there's no hydration flash */}
      <Sun className="size-5 dark:hidden" />
      <Moon className="hidden size-5 dark:block" />
    </button>
  );
}
