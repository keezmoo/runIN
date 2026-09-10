import * as React from "react";

import { cn } from "@/lib/utils";

type ToggleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean;
  size?: "default" | "sm";
};

const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ className, pressed = false, size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-pressed={pressed}
        className={cn(
          [
            "inline-flex items-center justify-center",
            "rounded-md border",
            "font-medium",
            "transition-colors",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-ring",
            "focus-visible:ring-offset-2",
            "focus-visible:ring-offset-background",
            "disabled:pointer-events-none",
            "disabled:opacity-50",
          ].join(" "),
          pressed
            ? "border-primary-strong bg-primary/20 text-foreground shadow-sm"
            : "border-input bg-card text-foreground hover:bg-accent",
          size === "sm"
            ? "min-h-9 px-3 py-2 text-sm"
            : "min-h-10 px-4 py-2 text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

ToggleButton.displayName = "ToggleButton";

export { ToggleButton };
