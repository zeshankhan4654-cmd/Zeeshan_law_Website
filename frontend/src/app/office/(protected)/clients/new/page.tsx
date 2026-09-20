import { PageHeading } from "@/components/office/PageHeading";
import { ClientForm } from "../ClientForm";

export const metadata = { title: "Add a client — Office" };

export default function NewClient() {
  return (
    <>
      <PageHeading title="Add a client" subtitle="Portal access can be switched on once they exist." />
      <ClientForm />
    </>
  );
}
