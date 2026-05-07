"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Tab = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type TabsProps = {
  tabs: ReadonlyArray<Tab>;
  paramName?: string;
  defaultTab?: string;
  className?: string;
};

export function Tabs({
  tabs,
  paramName = "tab",
  defaultTab,
  className,
}: TabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(paramName) ?? defaultTab ?? tabs[0]?.id;

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "flex items-center gap-1 p-1.5 rounded-2xl bg-night/5 border border-line w-fit max-w-full overflow-x-auto",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const params = new URLSearchParams(searchParams);
        if (tab.id === defaultTab) {
          params.delete(paramName);
        } else {
          params.set(paramName, tab.id);
        }
        const href = params.toString() ? `${pathname}?${params}` : pathname;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2",
              isActive
                ? "bg-white text-night shadow-soft"
                : "text-night-muted hover:text-night hover:bg-white/40",
            )}
          >
            {Icon ? <Icon className="w-4 h-4" /> : null}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
