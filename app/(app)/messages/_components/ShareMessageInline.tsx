"use client";

/* Rendu inline des messages de partage natif DIVARC :
 *   - post_share       : preview d'un post du feed
 *   - profile_share    : carte mini-profile
 *   - listing_share    : produit marketplace
 *   - job_share        : offre d'emploi
 *   - circle_invite    : invitation cercle
 *   - event_invite     : invitation événement
 *
 * Le body du message contient un JSON sérialisé { kind, target_id, ... }
 * → on parse + fetch les infos cible côté Realtime, et on affiche
 * une card cliquable navigant vers la cible. */

import {
  Briefcase,
  Calendar,
  Compass,
  FileText,
  ShoppingBag,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

type ShareKind =
  | "post_share"
  | "profile_share"
  | "listing_share"
  | "job_share"
  | "circle_invite"
  | "event_invite";

type Props = {
  kind: ShareKind;
  /* Body JSON sérialisé { target_id: uuid, extra_metadata?: ... }. */
  body: string;
};

type SharePayload = {
  target_id: string;
};

function safeParse(body: string): SharePayload | null {
  try {
    const obj = JSON.parse(body);
    if (typeof obj?.target_id === "string") return obj;
  } catch {
    /* ignore */
  }
  return null;
}

export function ShareMessageInline({ kind, body }: Props) {
  const parsed = safeParse(body);

  if (!parsed) {
    return (
      <p className="text-[12px] text-night-dim italic">
        Contenu partagé invalide.
      </p>
    );
  }

  switch (kind) {
    case "post_share":
      return <PostShareCard targetId={parsed.target_id} />;
    case "profile_share":
      return <ProfileShareCard targetId={parsed.target_id} />;
    case "listing_share":
      return <ListingShareCard targetId={parsed.target_id} />;
    case "job_share":
      return <JobShareCard targetId={parsed.target_id} />;
    case "circle_invite":
      return <CircleInviteCard targetId={parsed.target_id} />;
    case "event_invite":
      return <EventInviteCard targetId={parsed.target_id} />;
    default:
      return null;
  }
}

/* ========================================================== */
/* Post share */
/* ========================================================== */
function PostShareCard({ targetId }: { targetId: string }) {
  const [post, setPost] = useState<{
    id: string;
    body: string | null;
    author: {
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
    image_url: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("posts")
        .select("id, body, image_url, profiles(full_name, username, avatar_url)")
        .eq("id", targetId)
        .maybeSingle();
      if (alive && data) {
        const d = data as {
          id: string;
          body: string | null;
          image_url: string | null;
          profiles: {
            full_name: string | null;
            username: string | null;
            avatar_url: string | null;
          } | null;
        };
        setPost({
          id: d.id,
          body: d.body,
          image_url: d.image_url,
          author: d.profiles,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [targetId]);

  if (!post) return <SkeletonCard icon={FileText} label="Post DIVARC" />;

  return (
    <Link
      href={`/post/${post.id}`}
      className="block rounded-2xl bg-bg-soft border border-line hover:border-gold/40 overflow-hidden transition-colors max-w-[280px]"
    >
      {post.image_url ? (
        <div className="aspect-[16/10] bg-night/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar
            src={post.author?.avatar_url ?? null}
            fullName={
              post.author?.full_name ?? post.author?.username ?? "Auteur"
            }
            size="sm"
          />
          <p className="text-[11.5px] font-bold text-night truncate">
            {post.author?.full_name ?? post.author?.username ?? "Auteur"}
          </p>
        </div>
        {post.body ? (
          <p className="text-[12px] text-night-soft leading-snug line-clamp-3">
            {post.body}
          </p>
        ) : null}
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gold-deep">
          Voir le post →
        </p>
      </div>
    </Link>
  );
}

/* ========================================================== */
/* Profile share */
/* ========================================================== */
function ProfileShareCard({ targetId }: { targetId: string }) {
  const [profile, setProfile] = useState<{
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url, bio")
        .eq("id", targetId)
        .maybeSingle();
      if (alive && data) setProfile(data as typeof profile);
    })();
    return () => {
      alive = false;
    };
  }, [targetId]);

  if (!profile) return <SkeletonCard icon={User} label="Profil" />;

  const name = profile.full_name ?? profile.username ?? "Profil";

  return (
    <Link
      href={`/u/${profile.username ?? targetId}`}
      className="flex items-center gap-3 p-3 rounded-2xl bg-bg-soft border border-line hover:border-gold/40 transition-colors min-w-[240px] max-w-[280px]"
    >
      <Avatar
        src={profile.avatar_url}
        fullName={name}
        size="md-bold"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-extrabold text-night truncate">{name}</p>
        {profile.username ? (
          <p className="text-[11px] text-gold-deep truncate">
            @{profile.username}
          </p>
        ) : null}
        {profile.bio ? (
          <p className="text-[11px] text-night-dim line-clamp-2 mt-0.5">
            {profile.bio}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/* ========================================================== */
/* Listing share */
/* ========================================================== */
function ListingShareCard({ targetId }: { targetId: string }) {
  const [listing, setListing] = useState<{
    id: string;
    title: string;
    price_cents: number | null;
    currency: string | null;
    cover_url: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("listings")
        .select("id, title, price_cents, currency, cover_url")
        .eq("id", targetId)
        .maybeSingle();
      if (alive && data) setListing(data as typeof listing);
    })();
    return () => {
      alive = false;
    };
  }, [targetId]);

  if (!listing) return <SkeletonCard icon={ShoppingBag} label="Annonce" />;

  return (
    <Link
      href={`/market/listing/${listing.id}`}
      className="block rounded-2xl bg-bg-soft border border-line hover:border-gold/40 overflow-hidden transition-colors max-w-[260px]"
    >
      {listing.cover_url ? (
        <div className="aspect-square bg-night/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.cover_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <div className="p-3">
        <p className="text-[12.5px] font-bold text-night line-clamp-2">
          {listing.title}
        </p>
        {listing.price_cents !== null ? (
          <p className="mt-1 text-[14px] font-extrabold text-gold-deep tabular-nums">
            {(listing.price_cents / 100).toFixed(2)}{" "}
            {listing.currency ?? "EUR"}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/* ========================================================== */
/* Job share */
/* ========================================================== */
function JobShareCard({ targetId }: { targetId: string }) {
  const [job, setJob] = useState<{
    id: string;
    title: string;
    company_name: string | null;
    location: string | null;
    salary_min: number | null;
    salary_max: number | null;
    currency: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("jobs")
        .select(
          "id, title, company_name, location, salary_min, salary_max, currency",
        )
        .eq("id", targetId)
        .maybeSingle();
      if (alive && data) setJob(data as typeof job);
    })();
    return () => {
      alive = false;
    };
  }, [targetId]);

  if (!job) return <SkeletonCard icon={Briefcase} label="Offre" />;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-2xl bg-bg-soft border border-line hover:border-gold/40 p-3 transition-colors min-w-[240px] max-w-[280px]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-night text-cream">
          <Briefcase className="w-3.5 h-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-extrabold text-night truncate">
            {job.title}
          </p>
          {job.company_name ? (
            <p className="text-[10.5px] text-night-dim truncate">
              {job.company_name}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10.5px] text-night-dim mt-2">
        {job.location ? <span>📍 {job.location}</span> : null}
        {job.salary_min !== null && job.salary_max !== null ? (
          <span className="text-gold-deep font-bold tabular-nums">
            {Math.round((job.salary_min ?? 0) / 1000)}k –{" "}
            {Math.round((job.salary_max ?? 0) / 1000)}k{" "}
            {job.currency ?? "EUR"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

/* ========================================================== */
/* Circle invite */
/* ========================================================== */
function CircleInviteCard({ targetId }: { targetId: string }) {
  const [circle, setCircle] = useState<{
    id: string;
    name: string;
    slug: string;
    emoji: string | null;
    members_count: number;
    description: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("circles")
        .select("id, name, slug, emoji, members_count, description")
        .eq("id", targetId)
        .maybeSingle();
      if (alive && data) setCircle(data as typeof circle);
    })();
    return () => {
      alive = false;
    };
  }, [targetId]);

  if (!circle) return <SkeletonCard icon={Compass} label="Cercle" />;

  return (
    <Link
      href={`/circles/${circle.slug}`}
      className="flex items-center gap-3 p-3 rounded-2xl bg-bg-soft border border-line hover:border-gold/40 transition-colors min-w-[240px] max-w-[280px]"
    >
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold/15 text-2xl shrink-0">
        {circle.emoji ?? "⭕"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-extrabold text-night truncate">
          {circle.name}
        </p>
        <p className="text-[10.5px] text-gold-deep tabular-nums">
          {circle.members_count} membres
        </p>
        {circle.description ? (
          <p className="text-[10.5px] text-night-dim line-clamp-1 mt-0.5">
            {circle.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/* ========================================================== */
/* Event invite */
/* ========================================================== */
function EventInviteCard({ targetId }: { targetId: string }) {
  const [event, setEvent] = useState<{
    id: string;
    title: string;
    starts_at: string;
    location: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("events")
        .select("id, title, starts_at, location")
        .eq("id", targetId)
        .maybeSingle();
      if (alive && data) setEvent(data as typeof event);
    })();
    return () => {
      alive = false;
    };
  }, [targetId]);

  if (!event) return <SkeletonCard icon={Calendar} label="Événement" />;

  const dateStr = new Date(event.starts_at).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-3 p-3 rounded-2xl bg-bg-soft border border-line hover:border-gold/40 transition-colors min-w-[240px] max-w-[280px]"
    >
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold text-night shrink-0">
        <Calendar className="w-5 h-5" aria-hidden strokeWidth={2.4} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-extrabold text-night truncate">
          {event.title}
        </p>
        <p className="text-[10.5px] text-gold-deep">{dateStr}</p>
        {event.location ? (
          <p className="text-[10.5px] text-night-dim truncate">
            📍 {event.location}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/* ========================================================== */
/* Skeleton */
/* ========================================================== */
function SkeletonCard({
  icon: Icon,
  label,
}: {
  icon: typeof FileText;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-2xl bg-bg-soft border border-line text-night-dim min-w-[200px]">
      <Icon className="w-4 h-4 animate-pulse" aria-hidden />
      <span className="text-[11.5px] font-bold">{label}…</span>
    </div>
  );
}
