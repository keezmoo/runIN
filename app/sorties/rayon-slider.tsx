type RayonSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export default function RayonSlider({
  value,
  onChange,
}: RayonSliderProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="rayon"
          className="font-medium"
        >
          Dans un rayon de
        </label>

        <span className="font-semibold">
          {value} km
        </span>
      </div>

      <input
        id="rayon"
        type="range"
        min="5"
        max="100"
        step="5"
        value={value}
        onChange={(e) =>
          onChange(Number(e.target.value))
        }
        className="rayon-slider w-full"
      />

      <div className="mt-2 flex justify-between text-sm text-gray-400">
        <span>5 km</span>
        <span>100 km</span>
      </div>
    </div>
  );
}