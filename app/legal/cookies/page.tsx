export const metadata = {
  title: "Politique cookies",
  description: "Cookies et traceurs utilisés par DIVARC.",
};

const LAST_UPDATED = "10 mai 2026";

export default function CookiesPage() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.18em] text-gold-deep font-extrabold mb-2">
        · Cookies
      </p>
      <h1 className="text-[40px] sm:text-[52px] leading-[1.05]">
        Politique <em className="italic text-gold-deep">cookies</em>
      </h1>
      <p className="text-night-muted text-[13px]">
        Dernière mise à jour : {LAST_UPDATED}
      </p>

      <h2>1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
      <p>
        Un cookie est un petit fichier déposé sur ton navigateur lorsque tu
        utilises un site. DIVARC utilise un nombre minimal de cookies
        strictement nécessaires au fonctionnement du service.
      </p>

      <h2>2. Cookies utilisés par DIVARC</h2>

      <h3>Cookies essentiels (sans consentement)</h3>
      <ul>
        <li>
          <strong>Session Supabase</strong> (
          <code>sb-&lt;projet&gt;-auth-token</code>) — maintien de
          l&apos;authentification. Durée : session ou 7 jours selon « Se
          souvenir de moi ».
        </li>
        <li>
          <strong>CSRF / sécurité</strong> — protection contre les attaques
          cross-site. Durée : session.
        </li>
        <li>
          <strong>Préférences UI</strong> (thème, dernière langue) —
          localStorage, pas de cookie tiers. Durée : illimitée jusqu&apos;à
          effacement manuel.
        </li>
      </ul>

      <h3>Cookies de mesure (consentement requis)</h3>
      <p>
        DIVARC n&apos;utilise <strong>aucun cookie publicitaire</strong> ni
        traceur tiers (pas de Google Analytics, Meta Pixel, TikTok Pixel,
        etc.).
      </p>
      <p>
        Les statistiques internes d&apos;usage (nombre de posts, taux de
        rétention, latence) sont calculées côté serveur sur des données
        agrégées sans cookie.
      </p>

      <h2>3. Comment retirer son consentement</h2>
      <p>
        Tu peux à tout moment :
      </p>
      <ul>
        <li>
          Désactiver les recommandations algorithmiques depuis{" "}
          <a href="/settings/algorithm">paramètres → algorithme</a>.
        </li>
        <li>
          Désactiver les notifications push depuis{" "}
          <a href="/settings">paramètres → notifications</a>.
        </li>
        <li>
          Effacer tous les cookies DIVARC depuis les paramètres de ton
          navigateur.
        </li>
      </ul>

      <h2>4. Stockage local</h2>
      <p>
        DIVARC utilise <code>localStorage</code> et{" "}
        <code>IndexedDB</code> pour :
      </p>
      <ul>
        <li>Mettre en cache les images d&apos;avatar (offline-first PWA).</li>
        <li>Stocker les brouillons de posts non publiés.</li>
        <li>Conserver les paramètres d&apos;affichage.</li>
      </ul>
      <p>
        Ces données restent sur ton appareil et ne sont jamais transmises
        sans action explicite de ta part.
      </p>

      <h2>5. Plus d&apos;informations</h2>
      <p>
        Pour toute question relative à cette politique, contacte-nous à{" "}
        <a href="mailto:contact@divarc.app">contact@divarc.app</a> ou consulte
        la <a href="/legal/privacy">politique de confidentialité</a>.
      </p>
    </>
  );
}
