"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
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
  const router = useRouter();
  const params = useSearchParams();
  const activeCategory = params.get("category");
  const activeType = params.get("type");
  const activeMode = params.get("mode");
  const initialSkills = params.get("skills") ?? "";
  const [skills, setSkills] = useState(initialSkills);

  // Debounce push when skills change
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      const trimmed = skills.trim();
      if (trimmed.length === 0) next.delete("skills");
      else next.set("skills", trimmed);
      const target = next.toString() ? `${pathname}?${next}` : pathname;
      const current = window.location.pathname + window.location.search;
      if (target !== current) router.replace(target, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills]);

  function buildHref(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    return next.toString() ? `${pathname}?${next}` : pathname;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
          aria-hidden
        />
        <Input
          value={skills}
          onChange={(e) => setSkills(e.currentTarget.value)}
          placeholder="Filtrer par compétences (ex. React, Postgres, Figma)..."
          className="pl-9 pr-9"
        />
        {skills.length > 0 ? (
          <button
            type="button"
            onClick={() => setSkills("")}
            aria-label="Effacer"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-night/5 text-night-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        ) : null}
      </div>

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
