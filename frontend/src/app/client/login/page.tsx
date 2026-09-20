import { notFound } from "next/navigation";
import { getChamber } from "@/lib/site";
import { ClientLoginPage } from "./ClientLoginPage";

/**
 * The bare sign-in link, which belongs to the chamber whose website this
 * is. Every other chamber's clients arrive at /client/login/<chamber>
 * instead, from the link their own advocate sent them.
 */
const OWN_CHAMBER = process.env.NEXT_PUBLIC_PLATFORM_FIRM_SLUG ?? "arbitrator-law";

export async function generateMetadata() {
  const chamber = await getChamber(OWN_CHAMBER);
  return {
    title: `Client sign-in — ${chamber?.name ?? "Client portal"}`,
    description: "Clients of the chamber can follow their own matters here.",
  };
}

export default async function ClientLogin() {
  const chamber = await getChamber(OWN_CHAMBER);
  if (!chamber) notFound();

  return <ClientLoginPage chamber={chamber} />;
}
