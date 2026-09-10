"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function FilterDrawer({
  open,
  onOpenChange,
  title = "Filtres",
  children,
  footer,
}: FilterDrawerProps) {
  const boutonFermerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const overflowInitial = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function gererClavier(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", gererClavier);

    const animationFrame = window.requestAnimationFrame(() => {
      boutonFermerRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = overflowInitial;
      window.removeEventListener("keydown", gererClavier);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [open, onOpenChange]);

  return (
    <>
      {/* ==================================================
          LANGUETTE DESKTOP
          Elle se déplace avec le drawer.
      ================================================== */}

      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label={open ? "Fermer les filtres" : "Ouvrir les filtres"}
        className={cn(
          [
            "fixed",
            "top-[5.25rem]",
            "z-[70]",
            "hidden",
            "h-[70px]",
            "w-[84px]",
            "flex-col",
            "items-center",
            "justify-center",
            "gap-2",
            "rounded-l-xl",
            "rounded-r-none",
            "border",
            "border-r-0",
            "border-border",
            "bg-card",
            "text-foreground",
            "shadow-md",
            "transition-[right,background-color]",
            "duration-200",
            "hover:bg-accent",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-ring",
            "md:flex",
          ].join(" "),
          open ? "right-[420px]" : "right-0",
        )}
      >
        <span className="text-[11px] font-medium leading-none">
          {open ? "> Filtres" : "< Filtres"}
        </span>

        {/* TROIS TRAITS */}

        <span
          className="flex flex-col items-center gap-1"
          aria-hidden="true"
        >
          <span className="h-[2px] w-7 rounded-full bg-current" />
          <span className="h-[2px] w-5 rounded-full bg-current" />
          <span className="h-[2px] w-3 rounded-full bg-current" />
        </span>
      </button>

      {/* ==================================================
          BOUTON MOBILE
      ================================================== */}

      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-expanded={open}
          aria-label="Ouvrir les filtres"
          className="
            fixed
            bottom-20
            right-4
            z-50
            flex
            h-14
            w-14
            flex-col
            items-center
            justify-center
            gap-1
            rounded-xl
            border
            border-border
            bg-card
            text-foreground
            shadow-md
            transition-colors
            hover:bg-accent
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            md:hidden
          "
        >
          <span className="text-[9px] font-medium leading-none">
            Filtres
          </span>

          <span
            className="flex flex-col items-center gap-[3px]"
            aria-hidden="true"
          >
            <span className="h-px w-5 bg-current" />
            <span className="h-px w-4 bg-current" />
            <span className="h-px w-3 bg-current" />
          </span>
        </button>
      )}

      {/* ==================================================
          DRAWER
      ================================================== */}

      <div
        className={cn(
          "fixed inset-0 z-[60]",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        {/* VOILE */}

        <button
          type="button"
          aria-label="Fermer les filtres"
          tabIndex={open ? 0 : -1}
          onClick={() => onOpenChange(false)}
          className={cn(
            "absolute inset-0 bg-black/30 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        {/* PANNEAU */}

        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            [
              "absolute",

              /* MOBILE */
              "inset-x-0",
              "bottom-0",
              "flex",
              "max-h-[88dvh]",
              "flex-col",
              "rounded-t-2xl",
              "border",
              "border-border",
              "bg-card",
              "text-card-foreground",
              "shadow-xl",
              "transition-transform",
              "duration-200",

              /* DESKTOP */
              "md:inset-y-0",
              "md:left-auto",
              "md:right-0",
              "md:bottom-auto",
              "md:h-dvh",
              "md:max-h-none",
              "md:w-[420px]",
              "md:rounded-none",
              "md:border-y-0",
              "md:border-r-0",
              "md:border-l",
            ].join(" "),
            open
              ? "translate-y-0 md:translate-x-0"
              : "translate-y-full md:translate-x-full md:translate-y-0",
          )}
        >
          {/* EN-TÊTE */}

          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">
              {title}
            </h2>

            <Button
              ref={boutonFermerRef}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Fermer les filtres"
            >
              <X />
            </Button>
          </div>

          {/* CONTENU SCROLLABLE */}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            {children}
          </div>

          {/* PIED FIXE */}

          {footer && (
            <div className="shrink-0 border-t border-border bg-card p-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}