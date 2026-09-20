import { redirect } from "next/navigation";
import { platformTitle } from "@/lib/platform-brand";
import { getSessionUser } from "@/lib/session";
import { Console } from "./Console";

export const metadata = {
  title: platformTitle("Chambers"),
  robots: { index: false, follow: false },
};

/**
 * The platform console — every chamber on the platform, and the two things
 * that can be done to one.
 *
 * Reached by the handful of people who run the platform. Whether somebody
 * is one of those is checked on the server on every request; this page's
 * own check only saves a signed-out visitor a wasted round trip.
 */
export default async function Platform() {
  const me = await getSessionUser();
  if (!me) redirect("/office/login");

  return <Console />;
}
