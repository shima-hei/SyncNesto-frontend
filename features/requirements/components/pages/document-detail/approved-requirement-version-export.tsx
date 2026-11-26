"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import type { RequirementWorkflowRead } from "@/lib/api/generated/model";
import { fetchRequirementVersion } from "../../../lib/requirement-version-content";

export function ApprovedRequirementVersionExport({
  projectId,
  version,
}: {
  projectId: number;
  version: RequirementWorkflowRead;
}) {
  const download = useRef<AbortController | null>(null);
  useEffect(() => () => download.current?.abort(), []);
  const request = useMutation({
    mutationFn: async (signal: AbortSignal) => {
      const content = await fetchRequirementVersion(
        projectId,
        version.id,
        signal,
        version.release_id,
      );
      if (signal.aborted) return;
      const archive = new Blob(
        [
          JSON.stringify(
            { schema_version: 1, approval: version, content },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = `requirement-${version.document_id}-${version.version_label}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onSettled: () => {
      download.current = null;
    },
  });
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={request.isPending}
        onClick={() => {
          if (download.current) return;
          download.current = new AbortController();
          request.mutate(download.current.signal);
        }}
      >
        <DownloadIcon data-icon="inline-start" />
        {request.isPending ? "版を取得中…" : "承認済み版をJSONで出力"}
      </Button>
      <FormApiError error={request.error} />
    </div>
  );
}
