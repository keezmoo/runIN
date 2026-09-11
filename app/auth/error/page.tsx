import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Une erreur est survenue pendant l&apos;authentification. Vous pouvez
        réessayer depuis la page de connexion.
      </p>

      {params?.error && (
        <p className="text-xs text-muted-foreground">Code : {params.error}</p>
      )}
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Impossible de continuer</CardTitle>

            <CardDescription>
              L&apos;authentification n&apos;a pas pu être terminée.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">Chargement...</p>
              }
            >
              <ErrorContent searchParams={searchParams} />
            </Suspense>

            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">Retour à la connexion</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
