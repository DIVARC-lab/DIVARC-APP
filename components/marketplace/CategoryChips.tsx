"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CATEGORY_LIST } from "@/lib/utils/categories";
import { cn } from "@/lib/utils/cn";

type CategoryChipsProps = {
  pathname?: string;
};

export function CategoryChips({ pathname = "/marketplace" }: CategoryChipsProps) {
  const params = useSearchParams();
  const active = params.get("category");

  function buildHref(categoryId: string | null) {
    const newParams = new URLSearchParams(params);
    if (categoryId === null) {
      newParams.delete("category");
    } else {
      newParams.set("category", categoryId);
    }
    return newParams.toString() ? `${pathname}?${newParams}` : pathname;
  }

  return (
    <div className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1 scrollbar-thin">
      <Chip href={buildHref(null)} active={active === null} emoji="🌍">
        Tout
      </Chip>
      {CATEGORY_LIST.map((cat) => (
        <Chip
          key={cat.id}
          href={buildHref(cat.id)}
          active={active === cat.id}
          emoji={cat.emoji}
        >
          {cat.label}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
  emoji,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-all",
        active
          ? "bg-night text-cream border-night shadow-soft"
          : "bg-white text-night border-line hover:border-night/30",
      )}
    >
      <span aria-hidden>{emoji}</span>
      {children}
    </Link>
  );
}
