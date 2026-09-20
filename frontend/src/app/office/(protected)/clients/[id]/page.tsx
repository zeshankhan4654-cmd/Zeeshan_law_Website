import { ArrowLeft, FolderOpen, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch, type ClientDetail } from "@/lib/office-data";
import { can } from "@/lib/office-nav";
import { getSessionUser } from "@/lib/session";
import { formatDate } from "@/lib/portal-types";
import { ClientForm } from "../ClientForm";
import { PortalAccess } from "../PortalAccess";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId < 1) notFound();

  const [client, user] = await Promise.all([
    officeFetch<ClientDetail>(`/api/office/clients/${clientId}`),
    getSessionUser(),
  ]);
  if (!client) return <NotPermitted />;

  const mayEdit = can(user?.role, user?.capabilities, "clients.edit");
  const mayIssuePortal = can(user?.role, user?.capabilities, "clients.portal");

  return (
    <>
      <Link
        href="/office/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold"
      >
        <ArrowLeft className="size-4" /> Clients
      </Link>

      <PageHeading
        title={client.name}
        subtitle={[client.phone, client.email].filter(Boolean).join(" · ") || undefined}
        action={{ href: `/office/cases/new?client=${client.id}`, label: "Open a case" }}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="space-y-6">
          <section className="space-y-3 rounded-card border border-rule bg-surface p-6">
            <h2 className="font-display text-lg text-ink">Their matters</h2>
            {client.cases.length === 0 ? (
              <p className="text-sm text-ink-soft">No cases opened for this client yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {client.cases.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/office/cases/${c.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-gold"
                    >
                      <FolderOpen className="size-4 shrink-0 text-gold" />
                      <span className="min-w-40 flex-1 text-sm font-medium text-ink">{c.title}</span>
                      <span className="text-xs text-ink-soft">{c.status}</span>
                      {c.nextHearing && (
                        <span className="text-xs text-ink-soft">{formatDate(c.nextHearing)}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(client.address || client.notes) && (
            <section className="space-y-3 rounded-card border border-rule bg-surface p-6 text-sm">
              {client.address && (
                <p className="flex gap-2.5 text-ink">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                  {client.address}
                </p>
              )}
              {client.notes && (
                <div className="space-y-1 border-t border-rule pt-3">
                  <p className="text-xs font-semibold tracking-[0.1em] text-ink-soft uppercase">
                    Chamber note — not shared
                  </p>
                  <p className="leading-6 whitespace-pre-wrap text-ink">{client.notes}</p>
                </div>
              )}
            </section>
          )}

          {mayIssuePortal && (
          <PortalAccess
            clientId={client.id}
            enabled={client.portalEnabled}
            username={client.portalUsername}
            showFees={client.portalShowFees}
            mustChangePassword={client.portalMustChangePassword}
          />
          )}
        </div>

        {mayEdit && (
          <details className="rounded-card border border-rule bg-surface">
            <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-ink">
              Edit these details
            </summary>
            <div className="border-t border-rule p-2">
              <ClientForm id={client.id} initial={client} />
            </div>
          </details>
        )}
      </div>

      <p className="pt-6 text-xs text-ink-soft">Client since {formatDate(client.createdAt)}</p>
    </>
  );
}
