"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getGuestProjectProfileProjectsProjectIdGuestProfileGet as getProfile,
  updateGuestProjectProfileProjectsProjectIdGuestProfilePut as updateProfile,
} from "@/lib/api/generated/guest-project-profile/guest-project-profile";
import type { GuestProjectProfileSettings } from "@/lib/api/generated/model";
import { useTenant } from "@/features/tenants/providers/tenant-provider";

export function GuestProjectSettings({ projectId }: { projectId: number }) {
  const { tenant } = useTenant();
  const queryKey = ["guest-project-profile", tenant?.id, projectId] as const;
  const queryClient = useQueryClient();
  const lookup = useQuery({
    queryKey,
    queryFn: ({ signal }) => getProfile(projectId, { signal }),
  });
  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        ゲスト向けの公開用概要
      </summary>
      <div className="mt-3 grid max-w-2xl gap-3">
        <p className="text-sm text-muted-foreground">
          参加中のゲストにこの欄の内容を表示します。未設定の項目は空欄になります。
        </p>
        {lookup.isError ? (
          <DataLoadError
            resourceName="公開用概要"
            onRetry={() => void lookup.refetch()}
          />
        ) : !lookup.data ? (
          <Skeleton className="h-20" />
        ) : (
          <GuestProjectProfileForm
            key={`${tenant?.id}:${projectId}`}
            projectId={projectId}
            initial={lookup.data}
            onSaved={(profile) => queryClient.setQueryData(queryKey, profile)}
          />
        )}
      </div>
    </details>
  );
}

function GuestProjectProfileForm({
  projectId,
  initial,
  onSaved,
}: {
  projectId: number;
  initial: GuestProjectProfileSettings;
  onSaved: (profile: GuestProjectProfileSettings) => void;
}) {
  const [profile, setProfile] = useState(initial);
  const operation = useMutation({
    mutationFn: (data: GuestProjectProfileSettings) =>
      updateProfile(projectId, data),
    onSuccess: (saved) => {
      setProfile(saved);
      onSaved(saved);
      toast.success("公開用概要を保存しました");
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim() || null;
    operation.mutate({
      name: text("name"),
      description: text("description"),
      contact: text("contact"),
      starts_on: text("starts_on"),
      ends_on: text("ends_on"),
      announcement: text("announcement"),
      version: profile.version,
    });
  }
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FieldGroup key={profile.version}>
        <Field>
          <FieldLabel htmlFor="guest-profile-name">公開用案件名</FieldLabel>
          <Input
            id="guest-profile-name"
            name="name"
            defaultValue={profile.name ?? ""}
            maxLength={255}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="guest-profile-description">説明</FieldLabel>
          <Textarea
            id="guest-profile-description"
            name="description"
            defaultValue={profile.description ?? ""}
            maxLength={4000}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="guest-profile-start">開始日</FieldLabel>
            <Input
              id="guest-profile-start"
              name="starts_on"
              type="date"
              defaultValue={profile.starts_on ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="guest-profile-end">終了日</FieldLabel>
            <Input
              id="guest-profile-end"
              name="ends_on"
              type="date"
              defaultValue={profile.ends_on ?? ""}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="guest-profile-contact">窓口担当者</FieldLabel>
          <Input
            id="guest-profile-contact"
            name="contact"
            defaultValue={profile.contact ?? ""}
            maxLength={255}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="guest-profile-announcement">お知らせ</FieldLabel>
          <Textarea
            id="guest-profile-announcement"
            name="announcement"
            defaultValue={profile.announcement ?? ""}
            maxLength={4000}
          />
        </Field>
      </FieldGroup>
      {operation.error ? <FormApiError error={operation.error} /> : null}
      <Button
        className="justify-self-start"
        type="submit"
        disabled={operation.isPending}
      >
        公開用概要を保存
      </Button>
    </form>
  );
}
