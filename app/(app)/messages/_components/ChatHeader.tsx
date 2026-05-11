"use client";

import {
  ArrowLeft,
  BellOff,
  Lock,
  MoreVertical,
  Phone,
  Pin,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { PresenceDot } from "@/components/ui/PresenceDot";
import { PresenceLabel } from "@/components/ui/PresenceLabel";
import type { PresenceInfo } from "@/lib/database.types";
import { ConversationActionsSheet } from "./ConversationActionsSheet";

type SecretBadge = "active" | "pending" | "off";

type ChatHeaderProps = {
  conversationId: string;
  displayName: string;
  subtitle: string;
  avatarUrl: string | null;
  isGroup: boolean;
  otherPresence: PresenceInfo | null;
  /* Conv directe : username pour deep-link vers profil. */
  otherUsername: string | null;
  /* Flags par-membre courants (pré-fetchés côté server). */
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  /* État du mode secret (header badge). */
  secret: SecretBadge;
};

export function ChatHeader({
  conversationId,
  displayName,
  subtitle,
  avatarUrl,
  isGroup,
  otherPresence,
  otherUsername,
  isPinned,
  isArchived,
  isMuted,
  secret,
}: ChatHeaderProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Click sur la zone nom/avatar :
     - conv directe → profil de l'autre (/u/[username])
     - groupe → réglages du groupe */
  function handleHeaderInfoClick() {
    if (isGroup) {
      router.push(`/messages/${conversationId}/settings`);
    } else if (otherUsername) {
      router.push(`/u/${otherUsername}`);
    }
  }

  return (
    <div className="relative">
      <header className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-line bg-white">
        <Link
          href="/messages"
          aria-label="Retour aux discussions"
          className="lg:hidden w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Link>

        <button
          type="button"
          onClick={handleHeaderInfoClick}
          className="flex items-center gap-3 flex-1 min-w-0 -mx-2 px-2 py-1 rounded-2xl hover:bg-night/5 transition-colors text-left"
        >
          <div className="relative shrink-0">
            <Avatar
              src={avatarUrl}
              fullName={displayName}
              size="md"
            />
            {!isGroup && otherPresence ? (
              <PresenceDot
                status={otherPresence.presence_status}
                customStatus={otherPresence.custom_status}
                size="md"
                className="absolute bottom-0 right-0"
              />
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {isPinned ? (
                <Pin className="w-3 h-3 text-gold-deep shrink-0" aria-label="Épinglée" />
              ) : null}
              <h1 className="font-semibold text-night truncate">
                {displayName}
              </h1>
              {isGroup ? (
                <Users
                  className="w-3.5 h-3.5 text-night-muted shrink-0"
                  aria-hidden
                />
              ) : null}
              {secret === "active" ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 h-4 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-[0.08em] text-emerald-700 shrink-0"
                  title="Conversation secrète chiffrée bout-en-bout"
                >
                  <ShieldCheck className="w-2.5 h-2.5" aria-hidden />
                  E2E
                </span>
              ) : secret === "pending" ? (
                <Lock
                  className="w-3 h-3 text-night-muted shrink-0"
                  aria-label="Mode secret demandé"
                />
              ) : null}
              {isMuted ? (
                <BellOff
                  className="w-3 h-3 text-night-muted shrink-0"
                  aria-label="Notifications muettes"
                />
              ) : null}
            </div>
            <p className="text-xs text-muted truncate">
              {!isGroup && otherPresence ? (
                <PresenceLabel presence={otherPresence} fallback={subtitle} />
              ) : (
                subtitle
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => toast("Recherche dans la conversation arrive bientôt.")}
            aria-label="Rechercher dans la conversation"
            title="Rechercher (bientôt)"
            className="hidden sm:flex w-9 h-9 rounded-full hover:bg-night/5 items-center justify-center text-night-muted hover:text-night transition-colors"
          >
            <Search className="w-4 h-4" aria-hidden />
          </button>
          {!isGroup ? (
            <>
              <button
                type="button"
                onClick={() => toast("Appel audio arrive avec le Chantier 2.")}
                aria-label="Appel audio"
                title="Appel audio (bientôt)"
                className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted hover:text-night transition-colors"
              >
                <Phone className="w-4 h-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => toast("Visio arrive avec le Chantier 2.")}
                aria-label="Appel vidéo"
                title="Visio (bientôt)"
                className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted hover:text-night transition-colors"
              >
                <Video className="w-4 h-4" aria-hidden />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Plus d'options"
            aria-expanded={menuOpen}
            className="relative w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted hover:text-night transition-colors"
          >
            <MoreVertical className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </header>

      {/* Menu déroulant — overlay fermant au click extérieur */}
      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-4 sm:right-6 top-14 z-40 w-60 rounded-2xl bg-white border border-line shadow-[0_20px_60px_-20px_rgba(10,31,68,0.3)] overflow-hidden"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setSheetOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 h-12 text-left text-sm font-semibold text-night hover:bg-night/5"
            >
              <Pin className="w-4 h-4 text-night-muted" aria-hidden />
              Épingler · Archiver · Muet
            </button>
            {!isGroup ? (
              <Link
                href={`/messages/${conversationId}/security`}
                onClick={() => setMenuOpen(false)}
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 h-12 text-left text-sm font-semibold text-night hover:bg-night/5"
              >
                <Lock className="w-4 h-4 text-night-muted" aria-hidden />
                Conversation secrète
              </Link>
            ) : null}
            <Link
              href={`/messages/${conversationId}/settings`}
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              className="w-full flex items-center gap-3 px-4 h-12 text-left text-sm font-semibold text-night hover:bg-night/5 border-t border-line"
            >
              <Settings className="w-4 h-4 text-night-muted" aria-hidden />
              Réglages de la conversation
            </Link>
            {isArchived ? (
              <div className="border-t border-line px-4 py-2 text-[11px] text-muted">
                Cette conversation est archivée
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <ConversationActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        conversationId={conversationId}
        isPinned={isPinned}
        isArchived={isArchived}
        isMuted={isMuted}
      />
    </div>
  );
}
