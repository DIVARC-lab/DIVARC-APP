export const metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment DIVARC traite tes données personnelles, conformément au RGPD.",
};

const LAST_UPDATED = "10 mai 2026";

export default function PrivacyPage() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.18em] text-gold-deep font-extrabold mb-2">
        · Confidentialité
      </p>
      <h1 className="text-[40px] sm:text-[52px] leading-[1.05]">
        Politique de <em className="italic text-gold-deep">confidentialité</em>
      </h1>
      <p className="text-night-muted text-[13px]">
        Dernière mise à jour : {LAST_UPDATED}
      </p>

      <h2>1. Qui est responsable du traitement</h2>
      <p>
        DIVARC est une plateforme communautaire éditée à titre individuel. Le
        responsable du traitement des données est joignable à{" "}
        <a href="mailto:contact@divarc.app">contact@divarc.app</a>.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>
          <strong>Compte :</strong> email, nom d&apos;utilisateur, photo,
          biographie, ville (facultative).
        </li>
        <li>
          <strong>Contenus :</strong> posts, stories, messages, listings
          marketplace, candidatures jobs, sessions mentor.
        </li>
        <li>
          <strong>Interactions :</strong> likes, commentaires, partages,
          temps de lecture estimé (signaux recsys).
        </li>
        <li>
          <strong>Techniques :</strong> adresse IP (logs serveur 30 j),
          user-agent, identifiants de session.
        </li>
      </ul>

      <h2>3. Finalités</h2>
      <ul>
        <li>Fournir le service (authentification, fil, messagerie).</li>
        <li>
          Personnaliser le contenu (recommandations algorithmiques opt-in,
          désactivables dans les{" "}
          <a href="/settings/algorithm">paramètres algorithme</a>).
        </li>
        <li>
          Détecter les abus et appliquer le règlement DSA (modération,
          signalements).
        </li>
        <li>Notifications push et email transactionnel.</li>
      </ul>

      <h2>4. Bases légales (RGPD art. 6)</h2>
      <ul>
        <li>
          <strong>Exécution du contrat :</strong> compte, contenus, messages.
        </li>
        <li>
          <strong>Consentement :</strong> recommandations personnalisées,
          notifications push, cookies non-essentiels.
        </li>
        <li>
          <strong>Intérêt légitime :</strong> sécurité, prévention de la
          fraude, agrégats statistiques anonymisés.
        </li>
      </ul>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li>Compte actif : tant que l&apos;utilisateur ne supprime pas.</li>
        <li>
          Compte supprimé : effacement complet sous 30 jours (sauf logs de
          sécurité conservés 12 mois).
        </li>
        <li>Logs techniques : 30 jours.</li>
        <li>Événements recsys (interest profile) : 90 jours glissants.</li>
      </ul>

      <h2>6. Sous-traitants</h2>
      <ul>
        <li>
          <strong>Supabase</strong> (UE, Allemagne) — base de données,
          authentification, stockage.
        </li>
        <li>
          <strong>Vercel</strong> (UE/US) — hébergement applicatif.
        </li>
        <li>
          <strong>OpenAI</strong> (US) — embeddings sémantiques (texte des
          posts publics uniquement, pas de DM).
        </li>
      </ul>
      <p>
        Les transferts hors UE sont encadrés par les Clauses Contractuelles
        Types de la Commission européenne.
      </p>

      <h2>7. Tes droits</h2>
      <ul>
        <li>
          <strong>Accès & portabilité (art. 15 & 20) :</strong> exporter tes
          données depuis{" "}
          <a href="/settings">paramètres → confidentialité → exporter</a>.
        </li>
        <li>
          <strong>Rectification (art. 16) :</strong> modifier tes infos depuis
          ton profil.
        </li>
        <li>
          <strong>Effacement (art. 17) :</strong> supprimer ton compte depuis
          les paramètres.
        </li>
        <li>
          <strong>Opposition / retrait du consentement :</strong> à tout
          moment via les paramètres ou par email.
        </li>
        <li>
          <strong>Réclamation :</strong> auprès de la{" "}
          <a
            href="https://www.cnil.fr/fr/plaintes"
            target="_blank"
            rel="noreferrer"
          >
            CNIL
          </a>
          .
        </li>
      </ul>

      <h2>8. Sécurité</h2>
      <p>
        Chiffrement TLS en transit, RLS Postgres ligne par ligne, secrets
        gérés via Vercel Encrypted Environment, MFA disponible sur tous les
        comptes.
      </p>

      <h2>9. Modifications</h2>
      <p>
        Toute évolution majeure sera notifiée par email et affichée dans
        l&apos;application au moins 15 jours avant entrée en vigueur.
      </p>
    </>
  );
}
