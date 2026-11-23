"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getConflictCurrent } from "@/lib/api/conflict";
import type { ProjectNavigation, ProjectRead } from "@/lib/api/generated/model";
import { useUpdateProjectProjectsProjectIdPatch } from "@/lib/api/generated/projects/projects";
import {
  defaultProjectNavigation,
  projectNavigationSections,
  projectSubviewLinks,
} from "../../constants/joined-project-navigation";
import { setProjectDetailCache } from "../../lib/project-cache";

type Placement = ProjectNavigation["items"][number]["placement"];
const placementLabels: Record<Placement, string> = {
  primary: "上部に表示",
  overflow: "「その他」に表示",
  hidden: "非表示",
};

export function ProjectNavigationSettings({
  project,
}: {
  project: ProjectRead;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<{
    version: number;
    navigation: ProjectNavigation | null;
  } | null>(null);
  const saved = project.navigation ?? null;
  const working = draft ? draft.navigation : saved;
  const stale = draft !== null && draft.version !== project.version;
  const dirty =
    draft !== null && JSON.stringify(saved) !== JSON.stringify(working);
  const setWorking = (value: ProjectNavigation | null) => {
    if (JSON.stringify(saved) === JSON.stringify(value)) {
      setDraft(null);
      return;
    }
    setDraft((current) => ({
      version: current?.version ?? project.version,
      navigation: value,
    }));
  };
  const navigation = working ?? defaultProjectNavigation;
  const update = useUpdateProjectProjectsProjectIdPatch();

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const save = async () => {
    if (update.isPending || !draft || !dirty || stale) return;
    try {
      const current = await update.mutateAsync({
        projectId: project.id,
        data: { version: draft.version, navigation: draft.navigation },
      });
      setDraft(null);
      setProjectDetailCache(queryClient, project.id, current);
      toast.success("案件メニューを保存しました。");
    } catch (error) {
      const current = getConflictCurrent<ProjectRead>(error);
      if (current) {
        setProjectDetailCache(queryClient, project.id, current);
        toast.error("別の操作で案件が更新されました。");
      } else {
        toast.error("案件メニューを保存できませんでした。");
      }
    }
  };

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 1 || destination >= navigation.items.length) return;
    const items = [...navigation.items];
    [items[index], items[destination]] = [items[destination], items[index]];
    setWorking({ ...navigation, items });
  }

  return (
    <section
      aria-label="メニューの構成"
      className="flex w-full max-w-2xl flex-col gap-4"
    >
      {stale && (
        <p role="alert" className="text-sm text-destructive">
          案件が更新されました。キャンセルして最新の設定を読み直してください。
        </p>
      )}
      <form
        className="flex min-w-0 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset
          disabled={update.isPending}
          className="flex min-w-0 flex-col gap-4"
        >
          <legend className="sr-only">メニューの順序と表示位置</legend>
          <ol className="divide-y rounded-md border">
            {navigation.items.map(({ key, placement }, index) => {
              const entry = projectNavigationSections.find(
                (section) => section.key === key,
              );
              if (!entry) return null;
              const Icon = entry.icon;
              return (
                <li
                  key={key}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(5.5rem,9rem)_auto] items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3"
                >
                  <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="break-words">{entry.label}</span>
                  </div>
                  {key === "overview" ? (
                    <span className="text-sm text-muted-foreground">
                      先頭に表示
                    </span>
                  ) : (
                    <Select
                      value={placement}
                      disabled={update.isPending}
                      onValueChange={(value) => {
                        const items = navigation.items.map((item) =>
                          item.key === key
                            ? { ...item, placement: value as Placement }
                            : item,
                        );
                        setWorking({ ...navigation, items });
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="min-w-0 w-full"
                        aria-label={`${entry.label}の表示位置`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {Object.entries(placementLabels).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                  <div className="flex items-center gap-1">
                    {key !== "overview" && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 1 || update.isPending}
                          aria-label={`${entry.label}を上へ`}
                          onClick={() => move(index, -1)}
                        >
                          <ChevronUpIcon aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={
                            index === navigation.items.length - 1 ||
                            update.isPending
                          }
                          aria-label={`${entry.label}を下へ`}
                          onClick={() => move(index, 1)}
                        >
                          <ChevronDownIcon aria-hidden />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <DefaultViewField
              id="project-requirements-view"
              label="要件を開いたとき"
              value={navigation.requirements_view ?? "requirements"}
              onChange={(value) =>
                setWorking({
                  ...navigation,
                  requirements_view:
                    value as ProjectNavigation["requirements_view"],
                })
              }
            >
              {projectSubviewLinks.requirements.map(({ path, label }) => (
                <SelectItem key={path} value={path}>
                  {label}
                </SelectItem>
              ))}
            </DefaultViewField>
            <DefaultViewField
              id="project-tests-view"
              label="テストを開いたとき"
              value={navigation.tests_view ?? "test-designs"}
              onChange={(value) =>
                setWorking({
                  ...navigation,
                  tests_view: value as ProjectNavigation["tests_view"],
                })
              }
            >
              {projectSubviewLinks.tests.map(({ path, label }) => (
                <SelectItem key={path} value={path}>
                  {label}
                </SelectItem>
              ))}
            </DefaultViewField>
          </FieldGroup>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="mr-auto"
              disabled={!working}
              onClick={() => setWorking(null)}
            >
              標準に戻す
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!dirty}
              onClick={() => setDraft(null)}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={!dirty || stale || update.isPending}
            >
              {update.isPending ? "保存中…" : "変更を保存"}
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}

function DefaultViewField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>{children}</SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
