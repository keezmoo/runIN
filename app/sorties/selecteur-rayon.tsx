"use client";

export const RAYONS_KM = [1, 2, 3, 5, 10, 15, 20] as const;

type SelecteurRayonProps = {
  rayonKm: number;
  onRayonChange: (rayonKm: number) => void;
};

export function normaliserRayon(valeur: number) {
  const nombre = Number(valeur);

  if (!Number.isFinite(nombre)) {
    return 10;
  }

  let meilleurRayon: number = RAYONS_KM[0];
  let meilleureDifference = Math.abs(meilleurRayon - nombre);

  for (const rayon of RAYONS_KM.slice(1)) {
    const difference = Math.abs(rayon - nombre);

    if (difference < meilleureDifference) {
      meilleurRayon = rayon;
      meilleureDifference = difference;
    }
  }

  return meilleurRayon;
}

export default function SelecteurRayon({
  rayonKm,
  onRayonChange,
}: SelecteurRayonProps) {
  const rayonNormalise = normaliserRayon(rayonKm);
  const index = RAYONS_KM.findIndex((rayon) => rayon === rayonNormalise);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">Rayon de recherche</span>
        <span className="font-medium">{rayonNormalise} km</span>
      </div>

      <input
        type="range"
        min={0}
        max={RAYONS_KM.length - 1}
        step={1}
        value={index}
        onChange={(event) => {
          const nouvelIndex = Number(event.target.value);
          onRayonChange(RAYONS_KM[nouvelIndex]);
        }}
        className="w-full"
      />

      <div className="-mt-1 grid grid-cols-7 text-center">
        {RAYONS_KM.map((rayon) => (
          <button
            key={rayon}
            type="button"
            onClick={() => onRayonChange(rayon)}
            className={`
              text-[10px]
              ${rayon === rayonNormalise ? "font-semibold" : "text-gray-500"}
            `}
          >
            {rayon}
          </button>
        ))}
      </div>
    </div>
  );
}
