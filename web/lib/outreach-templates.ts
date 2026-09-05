import { DISCIPLINE_MAP, EMPTY_PROFILE, type Profile } from "./jobs";
import type { CompanyOutreach } from "./outreach";
import type { Discipline } from "./types";

/* ------------------------------------------------------------------ */
/*  Networking mail-merge copy for a JOB SEEKER (deterministic fill)    */
/*                                                                     */
/*  First-person notes to a recruiter / hiring manager at a company    */
/*  that is (or was recently) hiring for this profile. The seeker's    */
/*  name, headline and LinkedIn come from the local Profile; anything  */
/*  missing stays as a clearly bracketed placeholder.                  */
/* ------------------------------------------------------------------ */

export interface EmailTemplateOpts {
  profile?: Profile;
}

function disciplinePhrase(disciplines: Discipline[]): string {
  const labels = disciplines.map((d) => DISCIPLINE_MAP[d].label);
  if (labels.length === 0) return "Strategy & Operations";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function who(profile: Profile) {
  return {
    name: profile.name.trim() || "[Your Name]",
    headline:
      profile.headline.trim() ||
      "a Strategy & Operations leader (most recently at a large delivery marketplace) with experience in capital allocation, pricing and consumer growth across 40+ US markets",
    linkedin: profile.linkedin.trim() || "[LinkedIn URL]",
  };
}

export interface RenderedEmail {
  subject: string;
  body: string;
}

/** Touch 1 — a short, specific intro to a recruiter / hiring manager. */
export function emailTemplate(c: CompanyOutreach, opts: EmailTemplateOpts = {}): RenderedEmail {
  const p = who(opts.profile ?? EMPTY_PROFILE);
  const disciplines = disciplinePhrase(c.disciplines);
  const subject = `${disciplines} at ${c.name} — quick intro`;
  const body = [
    `Hi ${c.name} team,`,
    "",
    `I noticed ${c.personalization}, and wanted to reach out directly rather than only through the portal.`,
    "",
    `I'm ${p.headline}. I've spent the last few years owning weekly investment decisions, city-level pricing and retention playbooks that leaders actually used, and I'm now looking for my next ${disciplines} role.`,
    "",
    `If it's useful, I'd love 15 minutes to hear what the team is focused on and share how my work maps to it. My profile: ${p.linkedin}`,
    "",
    "Thanks for your time,",
    p.name,
  ].join("\n");
  return { subject, body };
}

/** Touch 2 (~4 days later) and Touch 3 (~7 days later). */
export function followUpTemplate(c: CompanyOutreach, step: 2 | 3, opts: EmailTemplateOpts = {}): RenderedEmail {
  const p = who(opts.profile ?? EMPTY_PROFILE);
  const disciplines = disciplinePhrase(c.disciplines);
  const subject = `Re: ${disciplines} at ${c.name} — quick intro`;
  if (step === 2) {
    return {
      subject,
      body: [
        `Hi ${c.name} team,`,
        "",
        `Floating my note back to the top of your inbox. I saw ${c.personalization} and think my background in strategy, pricing and market growth could be a strong match.`,
        "",
        `Happy to send a one-page summary or jump on a short call whenever works. Profile: ${p.linkedin}`,
        "",
        "Thanks,",
        p.name,
      ].join("\n"),
    };
  }
  return {
    subject,
    body: [
      `Hi ${c.name} team,`,
      "",
      `Last note from me, I promise. If ${disciplines} hiring is on pause, no problem at all; I'd still love to stay on your radar for when it picks up.`,
      "",
      `Profile for whenever it's useful: ${p.linkedin}`,
      "",
      "Thanks again,",
      p.name,
    ].join("\n"),
  };
}

/** A tighter LinkedIn connection note / InMail (300-character friendly). */
export function inmailTemplate(c: CompanyOutreach, opts: EmailTemplateOpts = {}): string {
  const p = who(opts.profile ?? EMPTY_PROFILE);
  const disciplines = disciplinePhrase(c.disciplines);
  return [
    `Hi — I'm ${p.name}, a Strategy & Operations leader (marketplace, pricing, growth).`,
    `Saw ${c.personalization}. I'd love to connect and hear more about the ${disciplines} team. Open to a quick chat?`,
  ].join("\n");
}
