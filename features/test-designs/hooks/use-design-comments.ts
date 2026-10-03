"use client";
import { useQuery } from "@tanstack/react-query";
import { listTestDesignCommentsProjectsProjectIdTestDesignsDesignIdCommentsGet as listComments } from "@/lib/api/generated/test-collaboration/test-collaboration";

export function useDesignComments(projectId: number, designId: number) {
  return useQuery({
    queryKey: ["test-design-comments", projectId, designId],
    queryFn: () => listComments(projectId, designId),
    staleTime: 30_000,
  });
}
