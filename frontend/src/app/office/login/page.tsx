import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getSettings } from "@/lib/site";
import { LoginForm } from "./LoginForm";

export default async function OfficeLoginPage() {
  // Already signed in? Send them where they actually belong rather than
  // showing a login form there is no reason to fill in again.
  const user = await getSessionUser();
  if (user) {
    redirect(user.mustChangePassword ? "/office/change-password" : "/office");
  }

  // Offering a door the API will refuse is worse than never showing it.
  const settings = await getSettings();

  return (
    <div className="grid min-h-screen place-items-center bg-ground px-6">
      <LoginForm publicSignup={settings["signup.public"] !== "off"} />
    </div>
  );
}
