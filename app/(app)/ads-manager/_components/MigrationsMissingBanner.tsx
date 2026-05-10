import { AlertTriangle } from "lucide-react";

/* Bannière affichée si les migrations 0048 + 0049 ne sont pas
 * appliquées en prod Supabase. Visible uniquement par les admins
 * pour ne pas inquiéter les utilisateurs lambda.
 *
 * À retirer dès que les migrations sont déployées. */
export function MigrationsMissingBanner({
  isAdmin,
}: {
  isAdmin: boolean;
}) {
  if (!isAdmin) return null;
  return (
    <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-[13px] text-amber-900 leading-relaxed">
      <p className="font-semibold flex items-center gap-2 mb-1.5">
        <AlertTriangle className="w-4 h-4" aria-hidden />
        Ads Manager — migrations Supabase requises
      </p>
      <p>
        Les tables <code>ads_business_accounts</code>,{" "}
        <code>ad_accounts</code>, <code>ads_campaigns</code>, etc. n&apos;ont
        pas l&apos;air d&apos;être créées. Applique les migrations dans
        l&apos;ordre :
      </p>
      <ol className="list-decimal pl-5 mt-2 space-y-1">
        <li>
          <code>supabase/migrations/0048_ads_foundation.sql</code> (18 tables
          + RLS + RPC user_has_ad_account_role)
        </li>
        <li>
          <code>supabase/migrations/0049_lookalike_audiences.sql</code>{" "}
          (RPC compute_lookalike_audience pgvector)
        </li>
      </ol>
      <p className="mt-2">
        Soit via{" "}
        <a
          href="https://supabase.com/docs/guides/cli"
          target="_blank"
          rel="noreferrer"
          className="underline font-semibold"
        >
          Supabase CLI
        </a>{" "}
        (<code>supabase db push</code>), soit en copiant-collant le contenu
        des fichiers dans le SQL Editor du projet Supabase.
      </p>
    </div>
  );
}
