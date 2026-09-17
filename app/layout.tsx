import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";

import "./globals.css";
import "leaflet/dist/leaflet.css";

import AppShell from "@/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://runin.fr"),

  title: {
    default: "runIN – Trouvez des partenaires de running et trail",
    template: "%s | runIN",
  },

  description:
    "Trouvez des partenaires de course près de chez vous, rejoignez des sorties running et trail ou créez les vôtres avec runIN.",

  applicationName: "runIN",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://runin.fr",
    siteName: "runIN",
    title: "runIN – Trouvez des partenaires de running et trail",
    description:
      "Trouvez des partenaires de course près de chez vous, rejoignez des sorties running et trail ou créez les vôtres avec runIN.",
  },

  twitter: {
    card: "summary_large_image",
    title: "runIN – Trouvez des partenaires de running et trail",
    description:
      "Trouvez des partenaires de course près de chez vous, rejoignez des sorties running et trail ou créez les vôtres avec runIN.",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
