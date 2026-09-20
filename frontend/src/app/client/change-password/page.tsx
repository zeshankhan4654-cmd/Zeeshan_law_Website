import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { getPortalClient } from "@/lib/portal-session";
import { PortalChangePasswordForm } from "./PortalChangePasswordForm";

export const metadata = { title: "Choose your password — The Arbitrator & Law Associates" };

/**
 * Deliberately outside the protected shell, and reachable by an account
 * that still owes a password change — the shell itself redirects here, so
 * putting this inside it would be a loop.
 */
export default async function PortalChangePassword() {
  const client = await getPortalClient();
  if (!client) redirect("/client/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-6 py-16">
      <Card className="w-full max-w-md border-t-4 border-t-gold">
        <CardBody className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="grid size-11 place-items-center rounded-md bg-gold-wash">
              <KeyRound className="size-5 text-gold" strokeWidth={1.5} />
            </span>
            <h1 className="font-display text-xl text-ink">Choose your own password</h1>
            <p className="text-sm leading-6 text-ink-soft">
              The password you were given is known to the office. Set one
              only you know before going any further.
            </p>
          </div>

          <PortalChangePasswordForm />
        </CardBody>
      </Card>
    </main>
  );
}
