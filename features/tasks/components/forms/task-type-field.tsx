"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { canManageTaskTypes } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import type { TaskTypeRead } from "@/lib/api/generated/model";
import {
  createTaskTypeProjectsProjectIdTaskTypesPost,
  updateTaskTypeProjectsProjectIdTaskTypesTypeKeyPatch,
} from "@/lib/api/generated/tasks/tasks";
import { useTaskTypes } from "../../hooks/use-task-types";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import { TaskSelectField } from "./task-form-fields";

export function TaskTypeField({
  projectId,
  value,
  error,
  onChange,
}: {
  projectId: number;
  value: string;
  error?: string;
  onChange: (key: string) => void;
}) {
  const { query, options } = useTaskTypes(projectId);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  return (
    <div className="flex flex-col gap-2">
      <TaskSelectField
        label="種別"
        value={value}
        options={options(value)}
        error={error}
        onChange={onChange}
      />
      {query.isError ? (
        <div className="text-sm text-destructive">
          種別を読み込めません。
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => void query.refetch()}
          >
            再試行
          </Button>
        </div>
      ) : null}
      {canManageTaskTypes(currentProjectRole) ? (
        <TaskTypeManager projectId={projectId} onCreated={onChange} />
      ) : null}
    </div>
  );
}

function TaskTypeManager({
  projectId,
  onCreated,
}: {
  projectId: number;
  onCreated: (key: string) => void;
}) {
  const { query, types } = useTaskTypes(projectId);
  const client = useQueryClient();
  const id = useId();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const nameRef = useMutationFocus(pending);
  const [error, setError] = useState("");
  const refresh = async () => {
    await Promise.all([
      query.refetch(),
      invalidateTaskProjectSurfaces(client, projectId, { includeBoard: true }),
    ]);
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="self-start">
          種別を管理
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>この案件のタスク種別</DialogTitle>
          <DialogDescription>
            標準種別に加えて独自の種別を設定できます。非表示にしても、既存タスクの種別は保持されます。
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!name.trim() || pending) return;
            setPending(true);
            setError("");
            try {
              const created =
                await createTaskTypeProjectsProjectIdTaskTypesPost(projectId, {
                  name,
                });
              await refresh();
              onCreated(created.key);
              setName("");
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "種別を追加できませんでした。",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={id}>新しい種別名</FieldLabel>
              <Input
                ref={nameRef}
                id={id}
                value={name}
                maxLength={80}
                disabled={pending}
                onChange={(e) => setName(e.target.value)}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button type="submit" disabled={pending || !name.trim()}>
              追加して選択
            </Button>
          </FieldGroup>
        </form>
        <div className="flex flex-col gap-4">
          {types
            .filter((type) => type.source === "custom")
            .map((type) => (
              <TaskTypeRow
                key={type.key}
                type={type}
                projectId={projectId}
                refresh={refresh}
              />
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskTypeRow({
  type,
  projectId,
  refresh,
}: {
  type: TaskTypeRead;
  projectId: number;
  refresh: () => Promise<void>;
}) {
  const id = useId();
  const [baseline, setBaseline] = useState(type);
  const [name, setName] = useState(type.name);
  const [active, setActive] = useState(type.is_active ?? true);
  const [pending, setPending] = useState(false);
  const nameRef = useMutationFocus(pending);
  const [error, setError] = useState("");
  return (
    <form
      className="rounded-lg border p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!name.trim() || !baseline.version || pending) return;
        setPending(true);
        setError("");
        try {
          const saved =
            await updateTaskTypeProjectsProjectIdTaskTypesTypeKeyPatch(
              projectId,
              type.key,
              { version: baseline.version, name, is_active: active },
            );
          setBaseline(saved);
          setName(saved.name);
          setActive(saved.is_active ?? true);
          await refresh();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "保存できませんでした。入力を保持しています。",
          );
          await refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={id}>種別名</FieldLabel>
          <Input
            ref={nameRef}
            id={id}
            value={name}
            maxLength={80}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox
            id={`${id}-active`}
            checked={active}
            disabled={pending}
            onCheckedChange={(checked) => setActive(checked === true)}
          />
          <FieldLabel htmlFor={`${id}-active`}>
            新しいタスクで選択できる
          </FieldLabel>
        </Field>
        {type.version !== baseline.version ? (
          <Field>
            <p className="text-sm">
              現在の保存内容：{type.name}／
              {type.is_active ? "選択可能" : "非表示"}。入力は保持しています。
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBaseline(type);
                setError("");
              }}
            >
              現在の版を確認して再保存する
            </Button>
          </Field>
        ) : null}
        {error ? <FieldError>{error}</FieldError> : null}
        <Button
          type="submit"
          size="sm"
          disabled={
            pending ||
            !name.trim() ||
            (name === baseline.name && active === baseline.is_active)
          }
        >
          変更を保存
        </Button>
      </FieldGroup>
    </form>
  );
}

function useMutationFocus(pending: boolean) {
  const input = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  useLayoutEffect(() => {
    if (pending) started.current = true;
    else if (started.current) {
      started.current = false;
      input.current?.focus();
    }
  }, [pending]);
  return input;
}
