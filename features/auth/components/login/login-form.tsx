"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";

import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DemoStart } from "./demo-start";
import { cn } from "@/lib/utils";

import { useLogin } from "../../hooks/use-login";
import { loginSchema } from "../../schemas/login-schema";
import type { LoginFormErrors } from "../../types/login";

export function LoginForm({
  className,
  demoEnabled = false,
  returnTo,
  ...props
}: React.ComponentProps<"div"> & { demoEnabled?: boolean; returnTo?: string }) {
  const emailId = useId();
  const passwordId = useId();
  const { login, isPending, error } = useLogin(returnTo);
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setErrors({});
    await login(result.data).catch(() => undefined);
  };

  const handleEnterSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-8"
            onSubmit={handleSubmit}
            autoComplete="on"
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">ログイン</h1>
              </div>

              <Field data-invalid={errors.email ? true : undefined}>
                <FieldLabel htmlFor={emailId}>メールアドレス</FieldLabel>
                <Input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  onChange={() =>
                    setErrors((current) => ({ ...current, email: undefined }))
                  }
                  onKeyDown={handleEnterSubmit}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? `${emailId}-error` : undefined
                  }
                />
                {errors.email ? (
                  <FieldError id={`${emailId}-error`}>
                    {errors.email}
                  </FieldError>
                ) : null}
              </Field>

              <Field data-invalid={errors.password ? true : undefined}>
                <FieldLabel htmlFor={passwordId}>パスワード</FieldLabel>
                <Input
                  id={passwordId}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  onChange={() =>
                    setErrors((current) => ({
                      ...current,
                      password: undefined,
                    }))
                  }
                  onKeyDown={handleEnterSubmit}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? `${passwordId}-error` : undefined
                  }
                />
                {errors.password ? (
                  <FieldError id={`${passwordId}-error`}>
                    {errors.password}
                  </FieldError>
                ) : null}
              </Field>

              {error ? <FieldError>{error}</FieldError> : null}

              <FormSubmitButton isPending={isPending}>
                {isPending ? "ログイン中..." : "ログイン"}
              </FormSubmitButton>
              <Link
                href="/forgot-password"
                className="text-center text-sm underline underline-offset-4"
              >
                パスワードを忘れた方
              </Link>
            </FieldGroup>
            {demoEnabled && (
              <div className="mt-6 flex flex-col gap-6">
                <Separator />
                <DemoStart />
              </div>
            )}
          </form>

          <div className="relative hidden bg-muted md:block">
            <Image
              src="/icon.svg"
              alt=""
              fill
              sizes="50vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
