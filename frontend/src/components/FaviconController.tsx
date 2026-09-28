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

export default function FaviconController({
  organizationLogoUrl,
}: {
  organizationLogoUrl?: string | null;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const pageBrand = document.querySelector<HTMLElement>(
      "[data-page-favicon]",
    );
    const pageLogoUrl = pageBrand?.dataset.pageFavicon;
    const nextIcon = pageBrand
      ? pageLogoUrl || iconForPath(pathname)
      : organizationLogoUrl || iconForPath(pathname);
    const iconUrl = nextIcon.startsWith("/") ? `${nextIcon}?v=1` : nextIcon;
    const absoluteIconUrl = new URL(iconUrl, document.baseURI).href;

    const syncIcons = () => {
      const icons = document.querySelectorAll<HTMLLinkElement>(
        'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
      );

      icons.forEach((icon) => {
        if (icon.href !== absoluteIconUrl) icon.href = iconUrl;
        icon.removeAttribute("type");
        icon.removeAttribute("sizes");
      });
    };

    syncIcons();

    const observer = new MutationObserver(syncIcons);
    observer.observe(document.head, {
      attributes: true,
      attributeFilter: ["data-page-favicon", "href", "rel", "sizes", "type"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [organizationLogoUrl, pathname]);

  return null;
}
