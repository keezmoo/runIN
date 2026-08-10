import Link from "next/link";

type FiltresSortiesProps = {
  typeActuel: string;
  dateActuelle: string;
};

export default function FiltresSorties({
  typeActuel,
  dateActuelle,
}: FiltresSortiesProps) {
  return (
    <form
      method="get"
      className="mb-8 space-y-4 rounded border p-4"
    >
      <h2 className="font-semibold">
        Rechercher une sortie
      </h2>

      <div>
        <label className="mb-1 block">
          Type de sortie
        </label>

        <select
          name="type"
          defaultValue={typeActuel}
          className="w-full rounded border p-2"
        >
          <option value="">Tous</option>
          <option value="route">Route</option>
          <option value="trail">Trail</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block">
          Date à partir de
        </label>

        <input
          type="date"
          name="date"
          defaultValue={dateActuelle}
          className="w-full rounded border p-2"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Rechercher
        </button>

        <Link
          href="/sorties"
          className="rounded border px-4 py-2"
        >
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}