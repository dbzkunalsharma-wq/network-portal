"use client";

import clsx from "clsx";
import { useState } from "react";
import {
  applyMailtoHref,
  applyNote,
  contactHref,
  DISCIPLINE_MAP,
  isEmailContact,
  isPhoneContact,
} from "@/lib/jobs";
import type { Job } from "@/lib/types";
import { useCopyToClipboard } from "@/lib/useCopyToClipboard";
import { useProfile } from "@/lib/useProfile";
import { CheckIcon, CopyIcon, MailIcon, PhoneIcon, SparkleIcon } from "./icons";

/**
 * Modal apply-assist block:
 *  - Surfaces `job.contact` prominently (email → mailto, phone → tel).
 *  - "Copy note" copies a first-person outreach note personalised from the
 *    local profile (name / headline / LinkedIn), with "Email with note" when
 *    the contact is an email. Template-only; no AI / API.
 *  - A small "Your details" drawer edits the profile once, saved on-device.
 */
export function ApplyAssist({ job }: { job: Job }) {
  const meta = DISCIPLINE_MAP[job.discipline];
  const { copied, copy } = useCopyToClipboard();
  const { profile, setProfile } = useProfile();
  const [editing, setEditing] = useState(false);

  const contact = job.contact?.trim() || null;
  const cHref = contact ? contactHref(contact) : null;
  const email = isEmailContact(contact);
  const phone = isPhoneContact(contact);
  const mailtoNote = applyMailtoHref(job, profile);
  const ContactIcon = phone ? PhoneIcon : MailIcon;
  const contactKind = email ? "Email" : phone ? "Call" : "Contact";
  const filled = !!(profile.name || profile.headline || profile.linkedin);

  return (
    <div className="mt-5 rounded-2xl border border-line bg-chalk/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SparkleIcon className={clsx("h-4 w-4", meta.text)} />
          <h3 className="text-sm font-semibold text-chalk">Apply assist</h3>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-xs font-medium text-chalk/55 underline-offset-2 hover:text-chalk hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40 focus-visible:rounded"
        >
          {editing ? "Done" : filled ? "Edit your details" : "Add your details"}
        </button>
      </div>

      {editing && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-chalk/10 bg-chalk/[0.03] p-3 sm:grid-cols-3">
          <Field label="Name" value={profile.name} onChange={(v) => setProfile({ name: v })} placeholder="Your name" />
          <Field label="LinkedIn URL" value={profile.linkedin} onChange={(v) => setProfile({ linkedin: v })} placeholder="linkedin.com/in/you" />
          <Field
            label="One-line headline"
            value={profile.headline}
            onChange={(v) => setProfile({ headline: v })}
            placeholder="a Strategy & Operations leader (ex-…)"
            className="sm:col-span-3"
          />
          <p className="text-[11px] text-chalk/40 sm:col-span-3">
            Saved only in this browser. Used to fill every note and network template.
          </p>
        </div>
      )}

      {contact && (
        <div className="mt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-chalk/40">{contactKind}</span>
          <div className="mt-1 flex items-center gap-2">
            <ContactIcon className="h-4 w-4 shrink-0 text-chalk/45" />
            {cHref ? (
              <a
                href={cHref}
                target={cHref.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={clsx("break-all text-sm font-medium underline decoration-dotted underline-offset-2 transition-colors hover:text-chalk", meta.text)}
              >
                {contact}
              </a>
            ) : (
              <span className="break-all text-sm font-medium text-chalk/80">{contact}</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(applyNote(job, profile))}
          aria-label="Copy a tailored outreach note to the clipboard"
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
            copied
              ? "border-green-600 bg-green-600 text-white"
              : "border-line bg-chalk/[0.05] text-chalk/75 hover:border-chalk/30 hover:bg-chalk/[0.1] hover:text-chalk"
          )}
        >
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
          {copied ? "Copied note" : "Copy intro note"}
        </button>
        {mailtoNote && (
          <a
            href={mailtoNote}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200",
              "border-line bg-chalk/[0.05] text-chalk/75 hover:border-chalk/30 hover:bg-chalk/[0.1] hover:text-chalk",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
            )}
          >
            <MailIcon className="h-3.5 w-3.5" />
            Email with note
          </a>
        )}
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-chalk/40">
        A short note to send the hiring manager or recruiter after applying. Personalise it before you send.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={clsx("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-chalk/40">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-line bg-chalk/[0.05] px-2.5 py-1.5 text-sm text-chalk placeholder:text-chalk/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
      />
    </label>
  );
}
