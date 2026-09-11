import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import NotificationsEmailButton from "../profil/notifications-email-button";
import CompteParametres from "./compte-parametres";
import MfaParametres from "./mfa-parametres";
import SessionsParametres from "./sessions-parametres";
import SuppressionCompte from "./suppression-compte";

export default function ParametresPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-4 md:p-6">
      <div className="mb-6">
        <h1 className="hidden text-2xl font-semibold md:block">Paramètres</h1>

        <p className="text-sm text-muted-foreground md:mt-1">
          Gérez votre compte et vos préférences runIN.
        </p>
      </div>

      <div className="space-y-6">
        {/* COMPTE */}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Compte</h2>

          <Card className="p-4">
            <CompteParametres />
          </Card>
        </section>

        {/* NOTIFICATIONS */}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Notifications</h2>

          <Card className="p-4">
            <NotificationsEmailButton />
          </Card>
        </section>

        {/* SÉCURITÉ */}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Sécurité</h2>

          <Card className="p-4">
            <MfaParametres />

            <div className="my-6 border-t" />

            <SessionsParametres />
          </Card>
        </section>

        {/* CONFIDENTIALITÉ */}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Confidentialité</h2>

          <Card className="p-4">
            <div className="space-y-5">
              <div>
                <p className="font-medium">Données personnelles</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Consultez les informations concernant l&apos;utilisation et la
                  protection de vos données personnelles.
                </p>

                <Button asChild variant="outline" className="mt-3">
                  <Link href="/confidentialite">
                    Politique de confidentialité
                  </Link>
                </Button>
              </div>

              <div className="border-t pt-5">
                <p className="text-sm text-muted-foreground">
                  Vous pouvez télécharger une copie des principales données
                  associées à votre compte runIN.
                </p>

                <Button asChild variant="outline" className="mt-3">
                  <a href="/api/compte/export">Télécharger mes données</a>
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* GESTION DU COMPTE */}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Gestion du compte</h2>

          <Card className="p-4">
            <SuppressionCompte />
          </Card>
        </section>
      </div>
    </main>
  );
}
