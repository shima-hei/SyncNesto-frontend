import { LoginForm } from "./login-form";
import { LoginSessionToast } from "./login-session-toast";

type LoginPageProps = {
  showSessionExpiredToast?: boolean;
};

export function LoginPage({
  showSessionExpiredToast = false,
}: LoginPageProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <LoginSessionToast showSessionExpiredToast={showSessionExpiredToast} />
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </main>
  );
}
