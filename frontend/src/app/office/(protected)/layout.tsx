import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { OfficeShell } from "./OfficeShell";

/**
 * The one place office routes are actually protected. This runs on the
 * server before anything renders — an unauthenticated visitor never sees so
 * much as a flash of the sidebar, and it works with JavaScript disabled.
 */
export default async function ProtectedOfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/office/login");
  }
  if (user.mustChangePassword) {
    redirect("/office/change-password");
  }

  return <OfficeShell user={user}>{children}</OfficeShell>;
}
