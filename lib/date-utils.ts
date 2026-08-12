const TIME_ZONE = "Europe/Paris";

// Transforme une date en YYYY-MM-DD
// selon l'heure française.
export function getDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat("fr-FR", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return `${year}-${month}-${day}`;
}

// Ajoute un certain nombre de jours à une date YYYY-MM-DD.
export function ajouterJours(
    dateKey: string,
    nombreJours: number
) {
    const [year, month, day] = dateKey
        .split("-")
        .map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day + nombreJours, 12)
    );

    const nouveauYear = date.getUTCFullYear();
    const nouveauMonth = String(
        date.getUTCMonth() + 1
    ).padStart(2, "0");
    const nouveauDay = String(
        date.getUTCDate()
    ).padStart(2, "0");

    return `${nouveauYear}-${nouveauMonth}-${nouveauDay}`;
}

// Exemple : lundi 10 août 2026
export function formatDateLongue(dateKey: string) {
    const [year, month, day] = dateKey
        .split("-")
        .map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day, 12)
    );

    return new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

// Exemple : mer. 12 août
export function formatDateCourte(dateKey: string) {
    const [year, month, day] = dateKey
        .split("-")
        .map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day, 12)
    );

    return new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    }).format(date);
}

// Exemple : 08:30
export function formatHeure(date: string) {
    return new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIME_ZONE,
    }).format(new Date(date));
}
// ------------------------------------------------
// DATE / HEURE LOCALE POUR INPUT DATETIME-LOCAL
// ------------------------------------------------

export function maintenantDatetimeLocal() {
    const maintenant = new Date();

    const decalage =
        maintenant.getTimezoneOffset() *
        60 *
        1000;

    return new Date(
        maintenant.getTime() - decalage
    )
        .toISOString()
        .slice(0, 16);
}