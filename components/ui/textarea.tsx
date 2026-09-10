import * as React from "react";

import { cn } from "@/lib/utils";
import { formControlClassName } from "@/components/ui/form-control";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        formControlClassName,
        "min-h-24 resize-y px-3 py-2 text-sm",
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
