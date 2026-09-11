import { cn } from "@/lib/utils";

type ChoiceCardProps = {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  disabled = false,
  className,
}: ChoiceCardProps) {
  return (
    <label
      className={cn(
        [
          "flex cursor-pointer items-start gap-3",
          "rounded-xl border p-3",
          "transition-colors",
          "focus-within:ring-2",
          "focus-within:ring-ring",
          "focus-within:ring-offset-2",
          "focus-within:ring-offset-background",
        ].join(" "),
        checked
          ? "border-primary-strong bg-primary/10"
          : "border-border bg-card hover:bg-accent",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary-strong))]"
      />

      <span className="min-w-0">
        <span className="block font-medium">
          {title}
        </span>

        {description && (
          <span className="mt-1 block text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}