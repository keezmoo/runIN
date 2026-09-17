"use client";

import { usePathname } from "next/navigation";

import NavigationPrincipale from "@/components/navigation-principale";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const landingPage = pathname === "/";

  return (
    <>
      {!landingPage && <NavigationPrincipale />}

      <div className={landingPage ? "" : "pb-20 md:pb-0"}>
        {children}
      </div>
    </>
  );
}