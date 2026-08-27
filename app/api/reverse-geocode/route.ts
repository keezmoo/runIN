import { createClient } from "@/lib/supabase/server";

type NominatimReverseResult = {
    lat: string;
    lon: string;
    name?: string;
    display_name: string;

    address?: {
        house_number?: string;
        road?: string;
        pedestrian?: string;
        footway?: string;
        path?: string;

        neighbourhood?: string;
        suburb?: string;

        city?: string;
        town?: string;
        village?: string;
        municipality?: string;

        postcode?: string;
    };
};

export async function GET(request: Request) {
    try {
        // ------------------------------------------------
        // UTILISATEUR CONNECTÉ
        // ------------------------------------------------

        const supabase = await createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return Response.json(
                {
                    error: "Utilisateur non authentifié.",
                },
                {
                    status: 401,
                },
            );
        }

        // ------------------------------------------------
        // COORDONNÉES
        // ------------------------------------------------

        const { searchParams } = new URL(request.url);

        const latitude = Number(searchParams.get("lat"));
        const longitude = Number(searchParams.get("lon"));

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return Response.json(
                {
                    error: "Coordonnées invalides.",
                },
                {
                    status: 400,
                },
            );
        }

        // ------------------------------------------------
        // NOMINATIM
        // ------------------------------------------------

        const url = new URL(
            "https://nominatim.openstreetmap.org/reverse",
        );

        url.searchParams.set("lat", String(latitude));
        url.searchParams.set("lon", String(longitude));
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("addressdetails", "1");

        const response = await fetch(url, {
            headers: {
                "User-Agent": "runIN/0.1",
                "Accept-Language": "fr",
            },

            cache: "no-store",
        });

        if (!response.ok) {
            return Response.json(
                {
                    error: "Le service de localisation ne répond pas.",
                },
                {
                    status: 502,
                },
            );
        }

        const resultat =
            (await response.json()) as NominatimReverseResult;

        if (
            !resultat.display_name ||
            typeof resultat.display_name !== "string"
        ) {
            return Response.json(
                {
                    error: "Aucun lieu trouvé à cette position.",
                },
                {
                    status: 404,
                },
            );
        }

        const adresse = resultat.address;

        const commune =
            adresse?.city ??
            adresse?.town ??
            adresse?.village ??
            adresse?.municipality;

        const voie =
            adresse?.road ??
            adresse?.pedestrian ??
            adresse?.footway ??
            adresse?.path;

        let nomCourt = "";

        if (
            resultat.name &&
            commune &&
            resultat.name !== commune &&
            resultat.name !== voie
        ) {
            nomCourt = `${resultat.name}, ${commune}`;
        } else if (
            adresse?.house_number &&
            voie &&
            commune
        ) {
            nomCourt =
                `${adresse.house_number} ${voie}, ${commune}`;
        } else if (voie && commune) {
            nomCourt = `${voie}, ${commune}`;
        } else if (commune) {
            nomCourt = commune;
        } else {
            // Sécurité si Nominatim ne fournit pas les champs attendus.
            nomCourt = resultat.display_name
                .split(",")
                .slice(0, 3)
                .join(",")
                .trim();
        }

        return Response.json({
            nom: nomCourt,
            latitude: Number(resultat.lat),
            longitude: Number(resultat.lon),
        });
    } catch (error) {
        console.error(
            "Erreur géocodage inverse :",
            error,
        );

        return Response.json(
            {
                error: "Une erreur inattendue est survenue.",
            },
            {
                status: 500,
            },
        );
    }
}
