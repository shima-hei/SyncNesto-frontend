"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shared/layout/page-header";
import { NotificationSummary } from "@/components/shared/notifications/notification-summary";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/providers/auth-provider";

import { useHomeProjects, useHomeTasks } from "../../hooks/use-home";
import { formatCalendarDate } from "../../lib/home-display";
import { HomeProjectsSection } from "../sections/home-projects-section";
import { HomeRequirementWorkSection } from "../sections/home-requirement-work-section";
import { TodayWorkSection } from "../sections/today-work-section";

export function HomePage() {
  const { user } = useAuth();
  const [timezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const tasksQuery = useHomeTasks(timezone);
  const projectsQuery = useHomeProjects(timezone);
  const today = tasksQuery.data?.today ?? projectsQuery.data?.today;

  return (
    <div className="@container/home flex w-full min-w-0 flex-col gap-6">
      <PageHeader
        title="ホーム"
        actions={
          today ? (
            <time dateTime={today} className="text-sm text-muted-foreground">
              {formatCalendarDate(today, true)}
            </time>
          ) : null
        }
      />
      <div
        id="my-work"
        tabIndex={-1}
        className="grid min-w-0 scroll-mt-4 gap-6"
      >
        <TodayWorkSection query={tasksQuery} />
        {user?.user_type === "internal" && !user.demo ? (
          <HomeRequirementWorkSection />
        ) : null}
      </div>
      <Separator />
      <NotificationSummary />
      <Separator />
      <HomeProjectsSection query={projectsQuery} />
    </div>
  );
}
