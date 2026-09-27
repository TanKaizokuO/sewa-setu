import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { Bell } from "lucide-react";
import { db, notifications } from "@/db";
import { currentCitizen, currentOfficer } from "@/lib/session";
import { getT } from "@/lib/i18n";
import { LangToggle } from "./lang-toggle";
import { LogoutButton } from "./logout-button";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "./logo";

export async function SiteHeader() {
  const [{ tt }, citizen, officer] = await Promise.all([getT(), currentCitizen(), currentOfficer()]);

  let unread = 0;
  if (citizen) {
    const [r] = await db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.citizenId, citizen.id), eq(notifications.read, false)));
    unread = r?.n ?? 0;
  }

  const links = officer
    ? officer.role === "admin"
      ? [{ href: "/analytics", label: tt("Analytics", "विश्लेषण") }, { href: "/grievances", label: tt("Grievances", "शिकायतें") }]
      : [
          { href: "/officer", label: tt("My Queue", "मेरी कतार") },
          { href: "/analytics", label: tt("Analytics", "विश्लेषण") },
          { href: "/grievances", label: tt("Grievances", "शिकायतें") },
        ]
    : [
        { href: "/services", label: tt("Services", "सेवाएं") },
        { href: "/assistant", label: tt("AI Sahayak", "एआई सहायक") },
        ...(citizen ? [{ href: "/dashboard", label: tt("My Applications", "मेरे आवेदन") }] : []),
        { href: "/grievance", label: tt("Grievance", "शिकायत") },
      ];

  return (
    <header className="sticky top-0 z-40 border-b print:hidden bg-white/85 backdrop-blur supports-backdrop-filter:bg-white/70">
      <div className="h-1 bg-gradient-to-r from-saffron via-white to-success" />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <Link href={officer ? (officer.role === "admin" ? "/analytics" : "/officer") : "/"} className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LangToggle />
          {citizen && (
            <Link href="/dashboard" className="relative rounded-full p-2 hover:bg-muted" aria-label="Notifications">
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid size-4.5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          )}
          {citizen || officer ? (
            <div className="flex items-center gap-2">
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-sm font-medium">{citizen ? tt(citizen.name, citizen.nameHi) : officer!.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {citizen ? `${citizen.village}, ${citizen.district}` : `${officer!.role} · ${officer!.tehsil}`}
                </div>
              </div>
              <LogoutButton />
            </div>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              {tt("Login", "लॉगिन")}
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1 md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
