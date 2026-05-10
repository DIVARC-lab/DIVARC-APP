import {
  ArrowLeft,
  Code2,
  CopyIcon,
  ExternalLink,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CreatePixelButton } from "./CreatePixelButton";

export const metadata = { title: "Pixels & suivi conversions" };

type Params = Promise<{ accountId: string }>;

export default async function PixelsPage({ params }: { params: Params }) {
  const { accountId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: accountId,
    p_min_role: "analyst",
  });
  if (!hasRole) notFound();

  /* Liste des pixels via service_role (RLS OK pour le user analyst+,
     mais admin client évite tout problème de policy). */
  let pixels: Array<{
    id: string;
    name: string;
    api_token: string;
    authorized_domains: string[];
    total_events: number;
    last_event_at: string | null;
    created_at: string;
  }> = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ads_pixels")
      .select("*")
      .eq("ad_account_id", accountId)
      .order("created_at", { ascending: false });
    pixels = data ?? [];
  } catch {
    /* Silent fallback en mode dégradé. */
  }

  /* Stats événements 30j par pixel. */
  const eventCounts = new Map<string, number>();
  if (pixels.length > 0) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    try {
      const admin = createAdminClient();
      const { data: events } = await admin
        .from("ad_conversions")
        .select("pixel_id")
        .in("pixel_id", pixels.map((p) => p.id))
        .gte("created_at", since);
      for (const e of events ?? []) {
        eventCounts.set(e.pixel_id, (eventCounts.get(e.pixel_id) ?? 0) + 1);
      }
    } catch {
      /* Silent — V2 : afficher placeholder. */
    }
  }

  return (
    <div className="px-5 sm:px-8 py-8 max-w-5xl mx-auto">
      <Link
        href={`/ads-manager/${accountId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Compte publicitaire
      </Link>

      <header className="mb-7 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <KickerLabel>· Suivi conversions</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
          >
            Pixels &amp;{" "}
            <em className="italic text-gold-deep">conversions</em>
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft max-w-2xl leading-relaxed">
            Installe le DIVARC Pixel sur ton site externe pour mesurer les
            conversions (achats, inscriptions, leads). Combine avec la{" "}
            <strong>Conversions API</strong> server-to-server pour une
            mesure fiable et résistante aux bloqueurs de pubs.
          </p>
        </div>
        <CreatePixelButton accountId={accountId} />
      </header>

      {pixels.length === 0 ? (
        <EmptyPixelsState />
      ) : (
        <div className="space-y-4">
          {pixels.map((p) => (
            <PixelCard
              key={p.id}
              pixel={p}
              eventCount30d={eventCounts.get(p.id) ?? 0}
            />
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Comment ça marche ?
        </h2>
        <div className="rounded-2xl bg-white border border-line p-5 sm:p-6 space-y-4 text-[13px] text-night-soft leading-relaxed">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
            >
              <Code2 className="w-4 h-4" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-night mb-1">
                1. Installe le pixel sur ton site
              </p>
              <p>
                Copie le snippet JavaScript ci-dessous et colle-le dans le
                <code> &lt;head&gt; </code> de toutes les pages de ton site
                (ou via Google Tag Manager). Le pixel collecte les
                impressions et conversions de manière anonyme et conforme
                RGPD.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
            >
              <Zap className="w-4 h-4" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-night mb-1">
                2. Track tes événements clés
              </p>
              <p>
                Standard events :{" "}
                <code>PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Lead, CompleteRegistration</code>
                .{" "}
                Custom events possibles via{" "}
                <code>dvarc(&apos;trackCustom&apos;, &apos;EventName&apos;, {`{ value, currency }`})</code>.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-night mb-1">
                3. Conversions API server-to-server (recommandé)
              </p>
              <p>
                Pour une mesure fiable même avec les bloqueurs de pubs ou
                ITP/ETP, envoie aussi tes events depuis ton serveur via
                Bearer token. DIVARC déduplique automatiquement Pixel × CAPI
                via <code>event_id</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Conformité RGPD / ePrivacy
        </h2>
        <div className="rounded-2xl bg-bg-soft border border-line p-4 text-[12.5px] text-night-soft leading-relaxed space-y-1.5">
          <p>
            <strong>Cookies first-party uniquement :</strong> 90 jours max.
          </p>
          <p>
            <strong>IP anonymisée :</strong> drop du dernier octet (IPv4) ou
            des 4 derniers groupes (IPv6) côté serveur DIVARC, automatique.
          </p>
          <p>
            <strong>PII hashed :</strong> emails, téléphones et external_id
            doivent être hashés SHA-256 côté client/serveur avant envoi
            (conformément au protocole CAPI).
          </p>
          <p>
            <strong>Consent obligatoire :</strong> charge le snippet pixel
            uniquement APRÈS l&apos;accord explicite de l&apos;utilisateur
            (opt-in cookie banner conforme).
          </p>
        </div>
      </section>
    </div>
  );
}

function EmptyPixelsState() {
  return (
    <div className="rounded-2xl bg-white border border-line p-8 text-center">
      <span
        aria-hidden
        className="mx-auto w-14 h-14 rounded-2xl bg-gold/15 text-gold-deep flex items-center justify-center mb-4"
      >
        <Code2 className="w-7 h-7" aria-hidden />
      </span>
      <p className="text-[15px] font-semibold text-night mb-1.5">
        Aucun pixel installé
      </p>
      <p className="text-[13px] text-night-muted max-w-md mx-auto">
        Crée ton premier DIVARC Pixel pour commencer à mesurer les
        conversions de tes campagnes.
      </p>
    </div>
  );
}

function PixelCard({
  pixel,
  eventCount30d,
}: {
  pixel: {
    id: string;
    name: string;
    api_token: string;
    authorized_domains: string[];
    total_events: number;
    last_event_at: string | null;
    created_at: string;
  };
  eventCount30d: number;
}) {
  return (
    <div className="rounded-2xl bg-white border border-line overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[15px] font-semibold text-night truncate">
              {pixel.name}
            </p>
            <span className="text-[11px] text-night-muted font-mono">
              ID {pixel.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="text-[12px] text-night-muted mt-1">
            Domaines autorisés :{" "}
            {pixel.authorized_domains.length > 0
              ? pixel.authorized_domains.join(", ")
              : "Aucun (à configurer)"}
          </p>
          <p className="text-[12px] text-night-muted mt-0.5">
            Dernier event :{" "}
            {pixel.last_event_at
              ? new Date(pixel.last_event_at).toLocaleString("fr-FR")
              : "Aucun"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10.5px] uppercase tracking-wider text-night-muted font-bold">
            Events 30j
          </p>
          <p className="text-[24px] font-bold text-night leading-none">
            {eventCount30d.toLocaleString("fr-FR")}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3">
        <SnippetBlock
          title="Snippet JavaScript (à coller dans le <head>)"
          code={`<script>
!function(d,p,s){var a=d.createElement(s);a.async=1;a.src=p;
d.head.appendChild(a)}(document,'https://divarc-app.vercel.app/divarc-pixel.js','script');
</script>
<script>
dvarc('init', '${pixel.id}');
dvarc('track', 'PageView');
</script>`}
        />

        <SnippetBlock
          title="Conversions API (Bearer token, à garder secret)"
          code={`POST https://divarc-app.vercel.app/api/ads/events/conversions
Authorization: Bearer ${pixel.api_token}
Content-Type: application/json

{
  "event_name": "Purchase",
  "event_id": "<unique_event_id>",
  "event_time": ${Math.floor(Date.now() / 1000)},
  "user_data": {
    "em": ["<sha256_hashed_email>"],
    "client_user_agent": "..."
  },
  "custom_data": {
    "value": 99.99,
    "currency": "EUR"
  }
}`}
          isSecret
        />
      </div>
    </div>
  );
}

function SnippetBlock({
  title,
  code,
  isSecret = false,
}: {
  title: string;
  code: string;
  isSecret?: boolean;
}) {
  return (
    <div className="rounded-xl bg-night text-cream overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-cream/10">
        <p className="text-[11px] uppercase tracking-wider font-bold text-cream/70">
          {title}
        </p>
        {isSecret ? (
          <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
            Secret
          </span>
        ) : null}
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-[11.5px] font-mono text-cream/95 leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
