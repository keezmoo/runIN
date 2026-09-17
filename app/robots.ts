import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/auth/",
        "/profil",
        "/messages/",
        "/notifications",
        "/parametres",
        "/admin/",
        "/membres/",
      ],
    },

    sitemap: "https://runin.fr/sitemap.xml",
  };
}