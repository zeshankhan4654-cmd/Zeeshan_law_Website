import { getSessionUser } from "@/lib/session";
import { MyAccount } from "./MyAccount";

export const metadata = { title: "My account" };

/**
 * The one office screen that is about the person signed in rather than the
 * chamber's work: the address they sign in with, and their password.
 *
 * Every account can reach it, with no capability, because a person must
 * always be able to change their own sign-in without asking anybody.
 */
export default async function AccountPage() {
  const me = await getSessionUser();
  if (!me) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-ink">My account</h1>
        <p className="text-sm text-ink-soft">
          {me.chamber ? `${me.chamber.name} — ` : ""}
          signed in as {me.fullName}.
        </p>
      </div>
      <MyAccount />
    </div>
  );
}
