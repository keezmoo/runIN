import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  // ------------------------------------------------
  // UTILISATEUR CONNECTÉ
  // ------------------------------------------------

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  // ------------------------------------------------
  // ADMINISTRATEUR
  // ------------------------------------------------

  const { data: role, error: roleError } = await supabase.rpc(
    "mon_role_application",
  );

  if (role !== "administrateur" && role !== "moderateur") {
    redirect("/sorties");
  }

  // ------------------------------------------------
  // MFA OBLIGATOIRE
  // ------------------------------------------------

  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    redirect("/sorties");
  }

  if (aal.currentLevel !== "aal2") {
    // Le MFA existe :
    // demander le code.
    if (aal.nextLevel === "aal2") {
      redirect("/auth/mfa?next=/admin");
    }

    // Administrateur sans MFA configuré :
    // accès admin interdit tant qu'il
    // n'a pas activé son second facteur.
    redirect("/parametres");
  }

  return children;
}
