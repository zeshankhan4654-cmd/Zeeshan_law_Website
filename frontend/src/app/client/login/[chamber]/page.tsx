import { notFound } from "next/navigation";
import { getChamber } from "@/lib/site";
import { ClientLoginPage } from "../ClientLoginPage";

/**
 * A chamber's own client sign-in, at the link its advocate hands out.
 *
 * An unknown or suspended chamber is a 404 rather than a form that will
 * never work: a client who mistypes the link should be told the link is
 * wrong, not left to conclude their password is.
 */
export async function generateMetadata({ params }: { params: Promise<{ chamber: string }> }) {
  const chamber = await getChamber((await params).chamber);
  return {
    title: chamber ? `Client sign-in — ${chamber.name}` : "Client sign-in",
    description: "Clients of the chamber can follow their own matters here.",
    // A sign-in page is nothing for a search engine to hold.
    robots: { index: false, follow: false },
  };
}

export default async function ChamberClientLogin({
  params,
}: {
  params: Promise<{ chamber: string }>;
}) {
  const chamber = await getChamber((await params).chamber);
  if (!chamber) notFound();

  return <ClientLoginPage chamber={chamber} />;
}
