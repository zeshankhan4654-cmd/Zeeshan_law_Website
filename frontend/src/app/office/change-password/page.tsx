import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/office/login");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ground px-6">
      <ChangePasswordForm forced={user.mustChangePassword} />
    </div>
  );
}
