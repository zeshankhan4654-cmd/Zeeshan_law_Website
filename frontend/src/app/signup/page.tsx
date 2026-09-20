import { Building2, Lock, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { getSessionUser } from "@/lib/session";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Register your chamber",
  description:
    "Any advocate can keep their diary, their clients' files and their own library here, private to their chamber.",
};

/**
 * Where an advocate who is not already here starts.
 *
 * The one page on the platform where somebody creates their own account.
 * What it creates is a new, empty chamber — the wall between chambers
 * applies to it from its first query. Staff and clients inside a chamber
 * are still issued by the advocate, never self-registered.
 */
export default async function Signup() {
  // Already signed in: sending them to a registration form would be absurd.
  const session = await getSessionUser();
  if (session) redirect("/office");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-ground px-6 py-16">
        <div className="w-full max-w-sm space-y-7">
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <span className="grid size-10 place-items-center rounded-md bg-gold-wash text-gold">
              <Logo className="size-6" />
            </span>
            <span className="text-sm leading-tight font-semibold">Advocates&rsquo; chambers</span>
          </Link>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
              For advocates
            </p>
            <h1 className="font-display text-2xl text-ink">Register your chamber</h1>
          </div>

          <SignupForm />
        </div>
      </div>

      <aside className="hidden flex-col justify-center gap-8 bg-ink px-12 py-16 lg:flex">
        <div className="space-y-3">
          <h2 className="font-display text-2xl text-white">
            Your chamber, and nobody else&rsquo;s business
          </h2>
          <p className="max-w-md leading-7 text-white/70">
            Your diary, your clients&rsquo; files, your fees and your own library — kept
            where you can reach them from the corridor outside court, and visible to
            nobody outside your chamber.
          </p>
        </div>

        <ul className="space-y-5">
          {[
            {
              icon: Lock,
              title: "Privileged means privileged",
              body: "Every record carries the chamber it belongs to, and the database itself refuses a query that reaches outside it. Not a rule we remember to follow — one the code cannot break.",
            },
            {
              icon: Users,
              title: "Your colleagues, your clients",
              body: "Add the colleagues in your chamber and give each the access their work needs. Send your clients a link of your own, and they see only their own matter.",
            },
            {
              icon: Building2,
              title: "Start the same afternoon",
              body: "Nothing waits on us approving you. Register, and the diary is there.",
            },
          ].map((f) => (
            <li key={f.title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-gold/15 text-gold-bright">
                <f.icon className="size-5" strokeWidth={1.6} />
              </span>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="max-w-sm text-sm leading-6 text-white/60">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
