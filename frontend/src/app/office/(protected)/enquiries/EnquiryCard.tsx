"use client";

import { Check, Mail, Phone, Undo2 } from "lucide-react";
import type { Enquiry } from "@/lib/office-data";
import { useMarkEnquiryRead } from "@/lib/use-office";

export function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const mark = useMarkEnquiryRead(enquiry.id);

  return (
    <article
      className={`space-y-3 rounded-card border p-5 ${
        enquiry.read ? "border-rule bg-surface" : "border-gold/40 bg-gold-wash/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">
            {enquiry.name}
            {enquiry.subject && <span className="text-ink-soft"> · {enquiry.subject}</span>}
          </p>
          <p className="text-xs text-ink-soft">
            {new Date(enquiry.createdAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => mark.mutate(!enquiry.read)}
          disabled={mark.isPending}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-rule hover:bg-gold-wash disabled:opacity-50"
        >
          {enquiry.read ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
          {enquiry.read ? "Mark unread" : "Mark read"}
        </button>
      </div>

      <p className="text-sm leading-6 whitespace-pre-wrap text-ink">{enquiry.message}</p>

      <div className="flex flex-wrap gap-4 border-t border-rule pt-3 text-sm">
        {enquiry.phone && (
          <a href={`tel:${enquiry.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-gold hover:underline">
            <Phone className="size-4" />
            {enquiry.phone}
          </a>
        )}
        {enquiry.email && (
          <a href={`mailto:${enquiry.email}`} className="flex items-center gap-1.5 text-gold hover:underline">
            <Mail className="size-4" />
            {enquiry.email}
          </a>
        )}
      </div>
    </article>
  );
}
