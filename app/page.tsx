import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "runIN – Trouvez des partenaires de running et trail",
  description:
    "Trouvez des partenaires de course près de chez vous, rejoignez des sorties running et trail ou créez les vôtres avec runIN.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Accueil runIN"
          >
            <img
              src="/logo-runin.svg"
              alt=""
              className="h-8 w-8 shrink-0"
              aria-hidden="true"
            />
            <defs>
              <linearGradient
                id="runinTextGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="50%" stopColor="hsl(var(--foreground))" />
                <stop offset="50%" stopColor="hsl(var(--primary-strong))" />
                <stop offset="100%" stopColor="hsl(var(--primary-strong))" />
              </linearGradient>
            </defs>
            <span
              className="
      bg-[linear-gradient(90deg,hsl(var(--foreground))_0%,hsl(var(--primary-strong))_20%,hsl(var(--primary-strong))_100%)]
      bg-clip-text
      text-2xl
      font-bold
      text-transparent
    "
            >
              runIN
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Connexion</Link>
            </Button>

            <Button asChild size="sm">
              <Link href="/auth/sign-up">Créer un compte</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ============================================ */}
      {/* HERO                                         */}
      {/* ============================================ */}

      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-strong">
            Running · Trail · Rencontres
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Trouvez des partenaires de course près de chez vous.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            runIN vous permet de trouver des coureurs autour de vous, de
            rejoindre des sorties running ou trail et de proposer vos propres
            entraînements.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Créer mon compte</Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* ROADMAP                                      */}
      {/* ============================================ */}

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-strong">
              À venir
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              runIN évolue.
            </h2>

            <p className="mt-4 leading-7 text-muted-foreground">
              runIN est encore en développement. De nouvelles fonctionnalités
              seront ajoutées progressivement pour faciliter les rencontres
              entre coureurs et améliorer l&apos;organisation des sorties.
            </p>
          </div>

          <div className="space-y-3">
            <Card className="flex gap-4 p-4">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-strong" />

              <div>
                <h3 className="font-semibold">Création de clubs</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Inscrivez vous à votre club et ne voyez que les sorties de ce
                  dernier.
                </p>
              </div>
            </Card>

            <Card className="flex gap-4 p-4">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-strong" />

              <div>
                <h3 className="font-semibold">Recherche plus précise</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  De nouveaux filtres et outils pour trouver plus facilement les
                  sorties qui vous correspondent.
                </p>
              </div>
            </Card>

            <Card className="flex gap-4 p-4">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-strong" />

              <div>
                <h3 className="font-semibold">Messagerie et communauté</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Une expérience progressivement enrichie pour communiquer avant
                  les sorties et rester en contact avec les autres coureurs.
                </p>
              </div>
            </Card>

            <Card className="flex gap-4 p-4">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-primary-strong" />

              <div>
                <h3 className="font-semibold">Et ensuite…</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Les retours des premiers utilisateurs aideront à définir les
                  prochaines évolutions de runIN.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA FINAL                                    */}
      {/* ============================================ */}

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Prêt à trouver votre prochaine sortie ?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Créez votre profil et découvrez les coureurs et les sorties
            disponibles autour de vous.
          </p>

          <Button asChild size="lg" className="mt-7">
            <Link href="/auth/sign-up">Créer mon compte</Link>
          </Button>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER                                       */}
      {/* ============================================ */}

      <footer>
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} runIN</span>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="mailto:contact@runin.fr" className="hover:text-foreground">
              Contact
            </a>

            <Link href="/auth/login" className="hover:text-foreground">
              Connexion
            </Link>

            <Link href="/auth/sign-up" className="hover:text-foreground">
              Inscription
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
