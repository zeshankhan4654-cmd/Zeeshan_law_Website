import { Empty, NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch, type Enquiry } from "@/lib/office-data";
import { EnquiryCard } from "./EnquiryCard";

export const metadata = { title: "Enquiries — Office" };

export default async function Enquiries() {
  const data = await officeFetch<{ items: Enquiry[]; unread: number }>("/api/office/enquiries");
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Enquiries"
        subtitle={
          data.unread > 0
            ? `${data.unread} waiting to be read`
            : "Everything here has been read"
        }
      />

      {data.items.length === 0 ? (
        <Empty>Nothing has come in through the website yet.</Empty>
      ) : (
        <div className="space-y-3">
          {data.items.map((e) => (
            <EnquiryCard key={e.id} enquiry={e} />
          ))}
        </div>
      )}
    </>
  );
}
