import Link from "next/link";

type Jour = {
    date: string;
    titre: string;
    sousTitre: string;
    disponible: boolean;
};

type NavigationJoursProps = {
    jours: Jour[];
};

export default function NavigationJours({
    jours,
}: NavigationJoursProps) {
    return (
        <nav className="mb-8">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {jours.map((jour) =>
                    jour.disponible ? (
                        <Link
                            key={jour.date}
                            href={`#jour-${jour.date}`}
                            className="rounded border p-2 text-center hover:bg-gray-100"
                        >
                            <div className="font-medium">
                                {jour.titre}
                            </div>

                            <div className="text-sm text-gray-500">
                                {jour.sousTitre}
                            </div>
                        </Link>
                    ) : (
                        <div
                            key={jour.date}
                            className="rounded border p-2 text-center opacity-40"
                        >
                            <div className="font-medium">
                                {jour.titre}
                            </div>

                            <div className="text-sm">
                                {jour.sousTitre}
                            </div>
                        </div>
                    )
                )}
            </div>
        </nav>
    );
}
