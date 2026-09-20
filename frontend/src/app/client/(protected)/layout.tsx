import { redirect } from "next/navigation";
import { getPortalClient } from "@/lib/portal-session";
import { PortalShell } from "./PortalShell";

/**
 * The one place portal routes are actually protected, mirroring the
 * office's own gate: it runs on the server before anything renders, so a
 * visitor with no session never sees a flash of somebody's case, and it
 * works with JavaScript disabled.
 *
 * It is a convenience, not the control — the API refuses every one of these
 * requests without a valid client session regardless of what is rendered.
 */
export default async function ProtectedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await getPortalClient();

  if (!client) redirect("/client/login");
  if (client.mustChangePassword) redirect("/client/change-password");

  return <PortalShell client={client}>{children}</PortalShell>;
}
