"use client";

import { useTransition } from "react";
import type { LeadActionType, LeadStatus } from "@prisma/client";
import { updateLeadStatus } from "./actions";

export interface LeadRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  propertyTitle: string | null;
  source: string;
  actionType: LeadActionType;
  status: LeadStatus;
  createdAt: string;
}

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-canvas-alt text-xs text-ink-secondary">
        <tr>
          <th scope="col" className="px-3 py-2">
            Contact
          </th>
          <th scope="col" className="px-3 py-2">
            Property
          </th>
          <th scope="col" className="px-3 py-2">
            Channel
          </th>
          <th scope="col" className="px-3 py-2">
            Source
          </th>
          <th scope="col" className="px-3 py-2">
            Received
          </th>
          <th scope="col" className="px-3 py-2">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((lead) => (
          <tr key={lead.id} className="border-t border-border">
            <td className="px-3 py-2">
              <p className="font-medium text-ink">{lead.name ?? "—"}</p>
              <p className="text-xs text-ink-secondary">{lead.phone ?? lead.email ?? ""}</p>
            </td>
            <td className="px-3 py-2 text-ink-secondary">{lead.propertyTitle ?? "General enquiry"}</td>
            <td className="px-3 py-2 text-ink-secondary">{lead.actionType}</td>
            <td className="px-3 py-2 text-ink-secondary">{lead.source}</td>
            <td className="px-3 py-2 text-ink-secondary">
              {new Date(lead.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </td>
            <td className="px-3 py-2">
              <select
                defaultValue={lead.status}
                disabled={isPending}
                aria-label={`Status for enquiry from ${lead.name ?? "unknown contact"}`}
                onChange={(e) =>
                  startTransition(() => updateLeadStatus(lead.id, e.target.value as LeadStatus))
                }
                className="rounded-sm border border-border bg-surface px-2 py-1 text-xs focus:border-accent focus:ring-2 focus:ring-accent/30"
              >
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="CLOSED">Closed</option>
              </select>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="px-3 py-10 text-center text-ink-secondary">
              No leads yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
