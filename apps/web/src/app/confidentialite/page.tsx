import Link from 'next/link';

export const metadata = {
  title: 'Politique de confidentialité — PharmaVie',
  description: 'Politique de confidentialité de l\'application PharmaVie (Côte d\'Ivoire)',
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-surface-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-bold text-brand-700">
            PharmaVie
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-brand-600">
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 prose prose-slate">
        <h1>Politique de confidentialité</h1>
        <p className="text-slate-500">Dernière mise à jour : juillet 2026</p>

        <h2>1. Qui sommes-nous ?</h2>
        <p>
          PharmaVie (« nous ») est une plateforme de mise en relation entre patients et pharmacies en
          Côte d&apos;Ivoire. Site :{' '}
          <a href="https://pharmavie.space">pharmavie.space</a>.
        </p>

        <h2>2. Données collectées</h2>
        <ul>
          <li><strong>Compte client :</strong> numéro de téléphone (+225), prénom/nom (optionnel).</li>
          <li><strong>Localisation :</strong> position GPS (avec votre accord) pour afficher les pharmacies proches.</li>
          <li><strong>Commandes :</strong> produits, pharmacie choisie, adresse de livraison si applicable.</li>
          <li><strong>Ordonnances :</strong> photos uploadées pour validation par le pharmacien.</li>
          <li><strong>Caméra :</strong> scan de codes-barres médicaments (sur demande).</li>
          <li><strong>Assistant IA :</strong> messages de conversation (orientation santé, sans diagnostic).</li>
        </ul>

        <h2>3. Finalités</h2>
        <p>
          Authentification OTP, recherche de médicaments, commandes, livraison, validation
          d&apos;ordonnances, amélioration du service et support client.
        </p>

        <h2>4. Partage des données</h2>
        <p>
          Vos données de commande sont transmises à la <strong>pharmacie choisie</strong> pour traiter
          votre demande. Nous utilisons des prestataires techniques (hébergement, SMS OTP) strictement
          nécessaires au fonctionnement. Nous ne vendons pas vos données personnelles.
        </p>

        <h2>5. Conservation</h2>
        <p>
          Les données sont conservées pendant la durée d&apos;utilisation du compte et conformément aux
          obligations légales applicables en Côte d&apos;Ivoire.
        </p>

        <h2>6. Vos droits</h2>
        <p>
          Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en
          contactant : <strong>contact@pharmavie.space</strong> (à adapter).
        </p>

        <h2>7. Sécurité</h2>
        <p>
          Connexions chiffrées (HTTPS), mots de passe hashés pour les comptes pharmacie/admin,
          authentification OTP pour les clients.
        </p>

        <h2>8. Santé et IA</h2>
        <p>
          L&apos;assistant IA informe mais ne remplace pas un avis médical. En cas d&apos;urgence,
          contactez le SAMU ou les services d&apos;urgence.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions : contact@pharmavie.space · Abidjan, Côte d&apos;Ivoire.
        </p>
      </main>
    </div>
  );
}
