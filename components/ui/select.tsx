import * as React from "react";

import { cn } from "@/lib/utils";
import { formControlClassName } from "@/components/ui/form-control";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(formControlClassName, "h-10 px-3 py-2 text-sm", className)}
      {...props}
    />
  );
});

Select.displayName = "Select";

export { Select };
