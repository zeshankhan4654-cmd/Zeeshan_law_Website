import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Site settings — Office" };

export default async function Settings() {
  const data = await officeFetch<{ settings: Record<string, string> }>("/api/office/settings");
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Site settings"
        subtitle="What the public website says about the chamber, and how people reach it."
      />
      <SettingsForm settings={data.settings} />
    </>
  );
}
