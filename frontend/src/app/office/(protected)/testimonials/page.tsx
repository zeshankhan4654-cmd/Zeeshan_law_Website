import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { Reviews, type Review } from "./Reviews";

export const metadata = { title: "Client reviews — Office" };

export default async function Testimonials() {
  const data = await officeFetch<{ items: Review[] }>("/api/office/testimonials");
  if (!data) return <NotPermitted />;

  const shown = data.items.filter((r) => r.published).length;

  return (
    <>
      <PageHeading
        title="Client reviews"
        subtitle={`${shown} shown on the homepage${
          data.items.length > shown ? `, ${data.items.length - shown} hidden` : ""
        }`}
      />
      <Reviews reviews={data.items} />
    </>
  );
}
