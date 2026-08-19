import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const requestedNext = searchParams.get("next");

  // Autorise uniquement une redirection interne au site.
  const next =
    requestedNext &&
      requestedNext.startsWith("/") &&
      !requestedNext.startsWith("//") &&
      !requestedNext.includes("\\")
      ? requestedNext
      : "/";

  if (!tokenHash || !type) {
    redirect(
      "/auth/error?error=Lien de confirmation invalide ou incomplet"
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    redirect(
      "/auth/error?error=Lien de confirmation invalide ou expiré"
    );
  }

  redirect(next);
}