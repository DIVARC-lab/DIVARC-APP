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

  /* Refonte Bold (handoff feed-marketplace L52-61) :
     h-8 px-3 r-2xl, active navy/cream weight 700, inactive white border-line
     color #4B5B87 weight 500, font 12, icon 12. */
  return (
    <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
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
        "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-2xl text-[12px] whitespace-nowrap transition-colors",
        active
          ? "bg-night text-cream font-bold"
          : "bg-white text-[#4B5B87] border border-line font-medium hover:border-night/30",
      )}
    >
      <span aria-hidden className="text-[12px] leading-none">
        {emoji}
      </span>
      {children}
    </Link>
  );
}
