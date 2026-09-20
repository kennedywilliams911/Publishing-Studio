"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  PenSquare,
  FileEdit,
  Globe2,
  UserRound,
  Settings,
  LogOut,
  X,
  BarChart3,
  MessageSquareText,
  Mail,
  Clock,
  CreditCard,
  Users,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-client";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/articles", label: "Articles", icon: Newspaper },
  { href: "/admin/proofreading", label: "Proofreading", icon: ClipboardCheck },
  {
    href: "/admin/articles/new",
    label: "Create Article",
    icon: PenSquare,
    exact: true,
  },
  { href: "/admin/drafts", label: "Drafts", icon: FileEdit },
  { href: "/admin/published", label: "Published", icon: Globe2 },
  { href: "/admin/scheduled", label: "Scheduled", icon: Clock },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/comments", label: "Comments", icon: MessageSquareText },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/profile", label: "Profile", icon: UserRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/billing", label: "Subscription", icon: CreditCard },
];

export default function AdminSidebar({
  pastorName,
  role,
  userId,
  onNavigate,
}: {
  pastorName: string;
  role?: "SUPER_ADMIN" | "ADMIN";
  userId?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
    toast.success("You've been signed out.");
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-parchment-50 text-ink-800 dark:bg-ink-950 dark:text-parchment-100">
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
            {pastorName}
          </p>
          <p className="text-xs uppercase tracking-wider text-gold-700/80 dark:text-gold-300/80">
            Publishing Studio
          </p>
        </div>
        <button
          onClick={onNavigate}
          className="rounded-md p-1 text-ink-500 hover:bg-parchment-200 dark:text-parchment-300 dark:hover:bg-ink-800 md:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3 [scrollbar-color:var(--color-parchment-300)_transparent] dark:[scrollbar-color:var(--color-ink-700)_transparent]">
        {[
          ...NAV.slice(0, 7),
          ...(userId
            ? [
                {
                  href: `/publisher/${userId}`,
                  label: "Public Page",
                  icon: ExternalLink,
                },
              ]
            : []),
          ...NAV.slice(7),
          ...(role === "SUPER_ADMIN"
            ? [{ href: "/admin/users", label: "Users", icon: Users }]
            : []),
        ].map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-parchment-200 hover:text-ink-900 dark:text-parchment-300 dark:hover:bg-ink-800 dark:hover:text-parchment-50",
                active &&
                  "bg-gold-100 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300",
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-parchment-300 p-3 dark:border-ink-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-parchment-200 hover:text-ink-900 dark:text-parchment-300 dark:hover:bg-ink-800 dark:hover:text-parchment-50"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </div>
  );
}
