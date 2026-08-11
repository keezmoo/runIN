import { createClient } from "@/lib/supabase/server";

import {
    notFound,
    redirect,
} from "next/navigation";

import Link from "next/link";

import ModifierSortieForm from "./modifier-sortie-form";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function ModifierSortiePage({
    params,
}: PageProps) {
    const { id } = await params;

    const supabase = await createClient();

    // Utilisateur connecté
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Recherche uniquement une sortie
    // appartenant à cet utilisateur
    const {
        data: sortie,
        error,
    } = await supabase
        .from("sorties")
        .select(
            `
        id,
        titre,
        nombre_max_participants,
        date_heure_depart,
        lieu_depart,
        type_sortie
      `
        )
        .eq("id", id)
        .eq("organisateur_id", user.id)
        .maybeSingle();

    if (error || !sortie) {
        notFound();
    }

    // Nombre de participants déjà inscrits
    const { count } = await supabase
        .from("participations")
        .select("*", {
            count: "exact",
            head: true,
        })
        .eq("sortie_id", id);

    // +1 car l'organisateur compte lui-même
    const nombreParticipants =
        (count ?? 0) + 1;

    return (
        <main className="mx-auto max-w-2xl p-6">

            <div className="mb-8">
                <Link
                    href="/mes-sorties"
                    className="rounded border px-4 py-2"
                >
                    ← Mes sorties
                </Link>
            </div>

            <h1 className="mb-6 text-2xl font-bold">
                Modifier la sortie
            </h1>

            <ModifierSortieForm
                sortie={sortie}
                nombreParticipants={
                    nombreParticipants
                }
            />

        </main>
    );
}