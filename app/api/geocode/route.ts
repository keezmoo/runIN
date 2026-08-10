type NominatimResult = {
    lat: string;
    lon: string;
    display_name: string;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const recherche = searchParams.get("q")?.trim();

    if (!recherche) {
        return Response.json(
            { error: "Lieu manquant." },
            { status: 400 }
        );
    }

    const url = new URL(
        "https://nominatim.openstreetmap.org/search"
    );

    url.searchParams.set("q", recherche);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    // Pour l'instant runIN recherche uniquement en France.
    url.searchParams.set("countrycodes", "fr");

    const response = await fetch(url, {
        headers: {
            "User-Agent": "runIN/0.1",
            "Accept-Language": "fr",
        },
        cache: "no-store",
    });

    if (!response.ok) {
        return Response.json(
            { error: "Le service de localisation ne répond pas." },
            { status: 502 }
        );
    }

    const resultats =
        (await response.json()) as NominatimResult[];

    if (resultats.length === 0) {
        return Response.json(
            { error: "Localisation introuvable." },
            { status: 404 }
        );
    }

    const lieu = resultats[0];

    return Response.json({
        nom: lieu.display_name,
        latitude: Number(lieu.lat),
        longitude: Number(lieu.lon),
    });
}