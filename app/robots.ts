import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://borderless.ghulam-mustafa.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/chat", "/form", "/explore"],
        disallow: ["/dashboard", "/results", "/api/", "/sign-in", "/sign-up", "/history"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
