import type { Metadata } from "next";
import { CompanyDirectory } from "@/components/CompanyDirectory";
import { PageNav } from "@/components/PageNav";
import { buildCompanies } from "@/lib/companies";
import { loadAllJobs } from "@/lib/jobs-data";
import { ogImageUrl } from "@/lib/og";

const OG_IMAGE = ogImageUrl({
  kind: "site",
  title: "US companies hiring Strategy & Ops",
  subtitle: "Deduped by company, with open-role counts",
  tag: "US strategy jobs",
});

export const metadata: Metadata = {
  title: { absolute: "Companies hiring Strategy & Ops in the US · DOD US" },
  description:
    "Browse every US company hiring Strategy & Operations, BizOps, Corporate Strategy, Growth & Pricing and Strategic Finance roles on DOD US, deduped by company with open-role counts.",
  alternates: { canonical: "/companies" },
  openGraph: {
    type: "website",
    title: "Companies hiring Strategy & Ops in the US · DOD US",
    description: "Every US company hiring Strategy & Ops talent, deduped with open-role counts.",
    url: "/companies",
    siteName: "DOD US",
    locale: "en_US",
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Companies hiring Strategy & Ops in the US · DOD US", description: "Every US company hiring Strategy & Ops talent, deduped with open-role counts.", images: [OG_IMAGE] },
};

export default async function CompaniesPage() {
  const jobs = await loadAllJobs();
  const companies = buildCompanies(jobs);
  const topCount = companies.filter((c) => c.isTop).length;

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <PageNav current="companies" />
        <div className="mt-8">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Companies hiring Strategy &amp; Ops in the US</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/60 sm:text-base">
            {companies.length.toLocaleString("en-US")} companies with live roles
            {topCount > 0 ? `, including ${topCount.toLocaleString("en-US")} top companies` : ""}. Pick a company to see all its openings.
          </p>
        </div>
        <CompanyDirectory companies={companies} />
      </div>
    </main>
  );
}
