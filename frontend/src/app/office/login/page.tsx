import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function OfficeLoginPage() {
  // Already signed in? Send them where they actually belong rather than
  // showing a login form there is no reason to fill in again.
  const user = await getSessionUser();
  if (user) {
    redirect(user.mustChangePassword ? "/office/change-password" : "/office");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ground px-6">
      <LoginForm />
    </div>
  );
}
