import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Merci pour votre inscription !
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Nous sommes heureux de vous compter parmi nous.
              </p>

              <p className="text-sm text-muted-foreground">
                Il ne vous reste plus qu&apos;à confirmer votre inscription en
                cliquant sur le lien dans l&apos;e-mail que nous venons de vous
                envoyer.
              </p>

              <div className="pt-4 text-right">
                <span className="text-lg font-semibold">
                  run<span className="text-primary-strong">IN</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}