import Link from 'next/link';
import {
  ArrowRight,
  MapPin,
  Package,
  Shield,
  Sparkles,
  Stethoscope,
} from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Pharmacies proches',
    description: 'Localisez les médicaments disponibles près de chez vous à Abidjan et partout en CI.',
  },
  {
    icon: Package,
    title: 'Commande & livraison',
    description: 'Commandez en ligne, retirez en pharmacie ou faites-vous livrer rapidement.',
  },
  {
    icon: Sparkles,
    title: 'Assistant IA',
    description: 'Orientation santé intelligente avec redirection vers les bons spécialistes.',
  },
  {
    icon: Stethoscope,
    title: 'Dashboard pharmacie',
    description: 'Gérez stock, prix et commandes depuis une interface web fluide et moderne.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-surface-muted">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            P
          </div>
          <span className="text-xl font-bold text-slate-900">PharmaVie</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-brand-700">
            Fonctionnalités
          </a>
          <Link href="/login" className="hover:text-brand-700">
            Espace pharmacie
          </Link>
          <Link href="/admin/login" className="hover:text-brand-700">
            Admin
          </Link>
        </nav>
        <Link href="/login" className="btn-primary">
          Accéder au dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            <Shield className="h-4 w-4" />
            Plateforme santé pour la Côte d&apos;Ivoire
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Vos médicaments,{' '}
            <span className="text-brand-600">au bon endroit</span>, au bon prix
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            PharmaVie connecte patients et pharmacies : recherche, disponibilité,
            commande et gestion d&apos;inventaire — le tout dans une expérience
            fluide et cohérente.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="btn-primary px-8 py-3 text-base">
              Démarrer — Espace pharmacie
            </Link>
            <a href="#features" className="btn-secondary px-8 py-3 text-base">
              Découvrir
            </a>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="card animate-slide-up transition hover:shadow-elevated"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-border bg-white py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} PharmaVie — Côte d&apos;Ivoire
      </footer>
    </div>
  );
}
