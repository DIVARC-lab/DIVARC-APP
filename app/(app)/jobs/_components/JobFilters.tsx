"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  JOB_CATEGORY_LIST,
  JOB_TYPE_LIST,
  WORK_MODE_META,
} from "@/lib/utils/jobs";

type JobFiltersProps = {
  pathname?: string;
};

export function JobFilters({ pathname = "/jobs" }: JobFiltersProps) {
  const params = useSearchParams();
  const activeCategory = params.get("category");
  const activeType = params.get("type");
  const activeMode = params.get("mode");

  function buildHref(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    return next.toString() ? `${pathname}?${next}` : pathname;
  }

  return (
    <div className="space-y-3">
      <FilterRow label="Type">
        <Chip href={buildHref("type", null)} active={activeType === null}>
          Tous
        </Chip>
        {JOB_TYPE_LIST.map((type) => (
          <Chip
            key={type.id}
            href={buildHref("type", type.id)}
            active={activeType === type.id}
          >
            <span aria-hidden className="mr-1">
              {type.emoji}
            </span>
            {type.label}
          </Chip>
        ))}
      </FilterRow>

      <FilterRow label="Mode">
        <Chip href={buildHref("mode", null)} active={activeMode === null}>
          Tous
        </Chip>
        {Object.entries(WORK_MODE_META).map(([id, meta]) => (
          <Chip
            key={id}
            href={buildHref("mode", id)}
            active={activeMode === id}
          >
            <span aria-hidden className="mr-1">
              {meta.emoji}
            </span>
            {meta.label}
          </Chip>
        ))}
      </FilterRow>

      <FilterRow label="Catégorie">
        <Chip
          href={buildHref("category", null)}
          active={activeCategory === null}
        >
          Toutes
        </Chip>
        {JOB_CATEGORY_LIST.map((cat) => (
          <Chip
            key={cat.id}
            href={buildHref("category", cat.id)}
            active={activeCategory === cat.id}
          >
            <span aria-hidden className="mr-1">
              {cat.emoji}
            </span>
            {cat.label}
          </Chip>
        ))}
      </FilterRow>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">
        {label}
      </p>
      <div className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1">{children}</div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all",
        active
          ? "bg-night text-cream border-night shadow-soft"
          : "bg-white text-night-muted border-line hover:border-night/30 hover:text-night",
      )}
    >
      {children}
    </Link>
  );
}
