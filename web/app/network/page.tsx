import type { Metadata } from "next";
import { OutreachTable } from "@/components/OutreachTable";
import { PageNav } from "@/components/PageNav";
import { loadCompanyLedger } from "@/lib/jobs-data";
import { buildOutreachFromLedger } from "@/lib/outreach";

/**
 * Network (server) — every US company seen hiring for this profile, accumulated
 * across daily runs into a growing ledger, turned into a ready networking list:
 * who's hiring now, how to reach them (MX-verified careers@/recruiting@ mailboxes,
 * LinkedIn recruiter search), a hiring-intent score and a three-touch follow-up
 * sequence personalised from your local profile. No auth; kept out of search.
 */

export const metadata: Metadata = {
  title: { absolute: "Network — companies to reach out to · Network Portal" },
  description: "Networking list: company-level contacts for US companies hiring Strategy & Ops talent.",
  robots: { index: false, follow: false },
  alternates: { canonical: undefined },
};

export default async function NetworkPage() {
  const ledger = await loadCompanyLedger();
  const companies = buildOutreachFromLedger(ledger);
  const hiringNow = companies.filter((c) => c.currentlyHiring).length;
  const withDomain = companies.filter((c) => c.domainVerified).length;
  const withPosted = companies.filter((c) => c.postedEmails.length > 0 || c.postedPhones.length > 0).length;

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <PageNav current="network" />

        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-chalk sm:text-3xl">Network</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-chalk/[0.06] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-chalk/55">
              Unlisted
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-chalk/60 sm:text-base">
            {companies.length.toLocaleString("en-US")} companies seen hiring Strategy &amp; Ops talent in the US,{" "}
            <span className="text-chalk/80">{hiringNow.toLocaleString("en-US")} hiring right now</span>, ranked by hiring intent.
            Most jobs are won through a warm intro, not the portal: use this list to reach a recruiter or hiring manager
            at each company before or right after you apply. The ledger grows every day.
          </p>

          <div className="pb-glass mt-4 rounded-2xl p-4 text-sm leading-relaxed text-chalk/65 sm:p-5">
            <p>
              <span className="font-medium text-chalk/85">How to use this:</span> the LinkedIn buttons open a people search for
              that company&rsquo;s recruiters; the{" "}
              <code className="rounded bg-chalk/10 px-1.5 py-0.5 text-[0.85em] text-chalk/85">careers@</code> /{" "}
              <code className="rounded bg-chalk/10 px-1.5 py-0.5 text-[0.85em] text-chalk/85">recruiting@</code> addresses are
              common patterns on each company&rsquo;s MX-verified domain (they can receive mail; nobody guarantees they read it).
              Copy the intro note, personalise one line, send, and mark the status. Add your name, headline and LinkedIn once
              in any job&rsquo;s Apply assist panel and every template fills itself in.
            </p>
            <p className="mt-2 text-xs text-chalk/45">
              {withDomain.toLocaleString("en-US")} companies have an MX-verified domain · {withPosted.toLocaleString("en-US")} published a direct
              email or phone in a post. Download the CSV for a mail-merge (Gmail + Mailmeteor / GMass). Status is saved locally in your browser only.
            </p>
          </div>
        </div>

        <OutreachTable companies={companies} />
      </div>
    </main>
  );
}
