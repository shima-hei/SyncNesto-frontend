"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { loginInitialValues } from "../constants/login-form";
import { useLogin } from "../hooks/use-login";
import { loginSchema } from "../schemas/login-schema";
import type { LoginFormErrors, LoginFormValues } from "../types/login";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const emailId = useId();
  const passwordId = useId();
  const { login, isPending, error } = useLogin();
  const [values, setValues] = useState<LoginFormValues>(loginInitialValues);
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = loginSchema.safeParse(values);

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

  const updateValue = (field: keyof LoginFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
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
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
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
                  value={values.password}
                  onChange={(event) =>
                    updateValue("password", event.target.value)
                  }
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

              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Spinner data-icon="inline-start" /> : null}
                  {isPending ? "ログイン中..." : "ログイン"}
                </Button>
              </Field>
            </FieldGroup>
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
