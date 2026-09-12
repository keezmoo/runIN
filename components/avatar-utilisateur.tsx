type AvatarUtilisateurProps = {
  nom: string | null | undefined;
  utilisateurId?: string | null;
  taille?: "sm" | "md" | "lg";
};

const couleurs = [
  "bg-emerald-200 text-emerald-950",
  "bg-sky-200 text-sky-950",
  "bg-violet-200 text-violet-950",
  "bg-amber-200 text-amber-950",
  "bg-rose-200 text-rose-950",
  "bg-cyan-200 text-cyan-950",
  "bg-lime-200 text-lime-950",
  "bg-orange-200 text-orange-950",
];

function couleurDepuisId(id: string) {
  let valeur = 0;

  for (let i = 0; i < id.length; i += 1) {
    valeur = (valeur + id.charCodeAt(i) * (i + 1)) % couleurs.length;
  }

  return couleurs[valeur];
}

export default function AvatarUtilisateur({
  nom,
  utilisateurId,
  taille = "md",
}: AvatarUtilisateurProps) {
  const nomNettoye = nom?.trim() || "?";
  const initiale = nomNettoye.charAt(0).toLocaleUpperCase("fr-FR");

  const couleur = couleurDepuisId(utilisateurId || nomNettoye);

  const classeTaille =
    taille === "sm"
      ? "h-8 w-8 text-xs"
      : taille === "lg"
        ? "h-14 w-14 text-lg"
        : "h-10 w-10 text-sm";

  return (
    <div
      className={`
        ${classeTaille}
        ${couleur}
        flex
        shrink-0
        items-center
        justify-center
        rounded-full
        font-semibold
        uppercase
        select-none
      `}
      aria-hidden="true"
    >
      {initiale}
    </div>
  );
}
