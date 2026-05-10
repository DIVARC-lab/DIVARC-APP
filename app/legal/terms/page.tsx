export const metadata = {
  title: "Conditions générales d'utilisation",
  description: "Les règles d'utilisation de DIVARC.",
};

const LAST_UPDATED = "10 mai 2026";

export default function TermsPage() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.18em] text-gold-deep font-extrabold mb-2">
        · CGU
      </p>
      <h1 className="text-[40px] sm:text-[52px] leading-[1.05]">
        Conditions générales d&apos;
        <em className="italic text-gold-deep">utilisation</em>
      </h1>
      <p className="text-night-muted text-[13px]">
        Dernière mise à jour : {LAST_UPDATED}
      </p>

      <h2>1. Objet</h2>
      <p>
        DIVARC est une plateforme communautaire qui combine fil social,
        cercles privés, marketplace, jobs, mentorat et messagerie. Les
        présentes CGU régissent l&apos;accès et l&apos;usage du service.
      </p>

      <h2>2. Inscription</h2>
      <p>
        L&apos;inscription est ouverte aux personnes majeures (≥ 16 ans avec
        autorisation parentale, ≥ 18 ans pour la marketplace et le wallet).
        Tu garantis l&apos;exactitude des informations fournies.
      </p>

      <h2>3. Comportements interdits</h2>
      <ul>
        <li>Harcèlement, discours haineux, incitation à la violence.</li>
        <li>Contenus illégaux (CSAM, terrorisme, contrefaçon, etc.).</li>
        <li>Usurpation d&apos;identité, fausses informations délibérées.</li>
        <li>Spam, scraping non autorisé, exploitation automatisée du service.</li>
        <li>
          Vente de produits ou services illégaux, contrefaits ou dangereux sur
          la marketplace.
        </li>
      </ul>

      <h2>4. Modération (DSA art. 14, 16, 17)</h2>
      <p>
        Tout utilisateur peut <strong>signaler</strong> un contenu via
        l&apos;icône drapeau. Les décisions de modération sont notifiées au
        contrevenant avec motif et possibilité de contestation interne.
      </p>
      <p>
        Sanctions graduées : avertissement → masquage du contenu →
        restriction temporaire → suspension définitive. Les contenus
        manifestement illégaux peuvent être retirés sans préavis.
      </p>

      <h2>5. Recommandations algorithmiques (DSA art. 27 & 38)</h2>
      <p>
        Tu peux choisir entre un fil <strong>chronologique strict</strong> et
        un fil <strong>algorithmique</strong> (par défaut). Les principaux
        signaux pris en compte sont accessibles depuis l&apos;icône{" "}
        <em>« Pourquoi ce post ? »</em> et détaillés dans les{" "}
        <a href="/settings/algorithm">paramètres algorithme</a>.
      </p>

      <h2>6. Propriété intellectuelle</h2>
      <p>
        Tu conserves la propriété de tes contenus. Tu accordes à DIVARC une
        licence non-exclusive, mondiale et gratuite pour héberger, afficher
        et distribuer tes contenus dans le cadre du service. Cette licence
        prend fin lors de la suppression du contenu (sauf copies déjà
        repartagées).
      </p>

      <h2>7. Marketplace & wallet</h2>
      <p>
        Les transactions marketplace sont opérées entre utilisateurs.
        DIVARC fournit l&apos;infrastructure (annonces, paiement Stripe
        Connect) mais n&apos;est pas partie au contrat de vente. Les fonds
        du wallet sont conservés en compte de cantonnement et reversés à la
        demande sous 5 jours ouvrés.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Le service est fourni « en l&apos;état ». DIVARC ne garantit pas
        l&apos;absence de bugs ni la disponibilité continue. Sa
        responsabilité est limitée aux dommages directs et plafonnée à 100 €
        par utilisateur, sauf en cas de faute lourde ou intentionnelle.
      </p>

      <h2>9. Résiliation</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis les paramètres.
        DIVARC peut suspendre ou supprimer un compte en cas de violation
        grave des présentes CGU, avec préavis sauf urgence.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige sera
        soumis à la juridiction compétente du domicile du défendeur, sauf
        disposition consumériste impérative plus favorable.
      </p>
    </>
  );
}
