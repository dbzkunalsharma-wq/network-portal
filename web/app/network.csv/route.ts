import { loadCompanyLedger } from "@/lib/jobs-data";
import { buildOutreachCsv, buildOutreachFromLedger, type OutreachSequence } from "@/lib/outreach";
import { emailTemplate, followUpTemplate } from "@/lib/outreach-templates";

/**
 * `/network.csv` — the networking list as a campaign-ready RFC-4180 CSV
 * (Mailmeteor / GMass). Statically generated from the growing company ledger;
 * no network I/O. Templates carry [bracketed] placeholders for the seeker's
 * name / LinkedIn (the browser-only profile can't reach a static route).
 */

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const ledger = await loadCompanyLedger();
  const companies = buildOutreachFromLedger(ledger);
  const csv = buildOutreachCsv(companies, (c): OutreachSequence => {
    const touch1 = emailTemplate(c);
    return {
      touch1Subject: touch1.subject,
      touch1Body: touch1.body,
      touch2Body: followUpTemplate(c, 2).body,
      touch3Body: followUpTemplate(c, 3).body,
    };
  });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="network-portal-contacts.csv"',
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
