"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const supabase = createClient();

    setIsLoading(true);
    setError(null);

    if (!captchaToken) {
      setError("Veuillez compléter le captcha.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken,
        },
      });

      if (error) {
        if (error.code === "invalid_credentials") {
          setError("Adresse e-mail ou mot de passe incorrect.");

          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);

          return;
        }

        throw error;
      }

      // Vérifie si ce compte possède un second facteur MFA.
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        throw aalError;
      }

      // Mot de passe validé, mais MFA encore nécessaire.
      if (aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        router.replace("/auth/mfa");
        return;
      }

      // Aucun MFA nécessaire, ou MFA déjà validé.
      router.replace("/sorties");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );

      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>

          <CardDescription>
            Connectez-vous à votre compte runIN.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">Adresse e-mail</Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.fr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                  <Label htmlFor="password">Mot de passe</Label>

                  <Link
                    href="/auth/forgot-password"
                    className="
                    ml-auto
                    text-sm
                    text-muted-foreground
                    underline-offset-4
                    hover:text-foreground
                    hover:underline
                  "
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                  onVerify={(token) => {
                    setCaptchaToken(token);
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                  }}
                  onError={() => {
                    setCaptchaToken(null);
                  }}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </div>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link
                href="/auth/sign-up"
                className="
                font-medium
                text-foreground
                underline-offset-4
                hover:underline
              "
              >
                Créer un compte
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
