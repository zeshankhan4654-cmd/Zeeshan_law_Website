import { Gauge } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getSessionUser(); // the layout above already guarantees this is non-null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Gauge className="size-6 text-gold" />
        <h1 className="font-display text-2xl text-ink">Dashboard</h1>
      </div>

      <Card>
        <CardBody>
          <p className="text-ink">
            Good to see you, <strong>{user?.fullName}</strong>.
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            The real dashboard — today&apos;s cause list, hearing counts, clients waiting for an
            answer — is built in Phase 5, once cases and clients themselves exist. This page
            proves the shell around it: you are signed in, your role is{" "}
            <strong>{user?.role}</strong>, and the sidebar only shows what your capabilities allow.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
