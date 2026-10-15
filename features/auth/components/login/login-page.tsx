import { ThemeSwitcher } from "@/components/shared/display/theme-switcher";
import { PublicInformationLinks } from "@/components/shared/public/public-information-page";

import { LoginForm } from "./login-form";
import { LoginSessionToast } from "./login-session-toast";

type LoginPageProps = {
  showSessionExpiredToast?: boolean;
  demoEnabled?: boolean;
  returnTo?: string;
};

export function LoginPage({
  showSessionExpiredToast = false,
  demoEnabled = false,
  returnTo,
}: LoginPageProps) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-muted px-6 py-16 md:p-10">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <LoginSessionToast showSessionExpiredToast={showSessionExpiredToast} />
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm demoEnabled={demoEnabled && !returnTo} returnTo={returnTo} />
      </div>
      <div className="mt-6">
        <PublicInformationLinks />
      </div>
    </main>
  );
}
