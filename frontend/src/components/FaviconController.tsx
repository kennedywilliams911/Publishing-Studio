"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DEFAULT_ICON = "/open-book.svg";
const ICONS: Array<{ path: string; icon: string }> = [
  { path: "/admin/analytics", icon: "/favicon-analytics.svg" },
  { path: "/admin/billing", icon: "/favicon-billing.svg" },
  { path: "/admin/users", icon: "/favicon-users.svg" },
  { path: "/admin/profile", icon: "/favicon-profile.svg" },
  { path: "/admin", icon: "/favicon-dashboard.svg" },
];

function iconForPath(pathname: string) {
  return (
    ICONS.find(
      ({ path }) => pathname === path || pathname.startsWith(`${path}/`),
    )?.icon ?? DEFAULT_ICON
  );
}

export default function FaviconController() {
  const pathname = usePathname();

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = `${iconForPath(pathname)}?v=1`;
  }, [pathname]);

  return null;
}
