import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
const BASE_URL = SITE_URL;

/**
 * Allow all crawlers everywhere except the internal, unlisted networking
 * tool (`/network` + its CSV export), which is kept out of search engines.
 * Point crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/network", "/network.csv"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
