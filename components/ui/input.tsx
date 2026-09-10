import * as React from "react";

import { cn } from "@/lib/utils";
import { formControlClassName } from "@/components/ui/form-control";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        formControlClassName,
        [
          "flex h-10",
          "px-3 py-2",
          "text-base md:text-sm",
          "file:border-0",
          "file:bg-transparent",
          "file:text-sm",
          "file:font-medium",
          "file:text-foreground",
        ].join(" "),
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };