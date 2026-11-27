"use client";

import { useState } from "react";
import { ApprovalMfa } from "@/features/guest-fixed-approvals/components/approval-mfa";
import { SharedApprovalList } from "@/features/guest-fixed-approvals/components/shared-approval-list";
import { SharedRequirementReviewList } from "@/features/guest-requirement-reviews/components/shared-review-list";
import { cn } from "@/lib/utils";

export function SharedDecisionLists({
  returnTo,
  ...props
}: {
  participationId?: string;
  publicationId?: string;
  compact?: boolean;
  returnTo: string;
}) {
  const [reviewMfa, setReviewMfa] = useState(false);
  const [formalMfa, setFormalMfa] = useState(false);
  const [fixedMfa, setFixedMfa] = useState(false);
  const needsMfa = reviewMfa || formalMfa || fixedMfa;
  return (
    <>
      {needsMfa && <ApprovalMfa returnTo={returnTo} />}
      <div
        hidden={needsMfa}
        className={cn(
          "grid gap-4",
          props.compact && "sm:grid-cols-2 xl:grid-cols-3",
        )}
      >
        <SharedRequirementReviewList {...props} onMfaRequired={setReviewMfa} />
        <SharedRequirementReviewList
          {...props}
          formal
          onMfaRequired={setFormalMfa}
        />
        <SharedApprovalList {...props} onMfaRequired={setFixedMfa} />
      </div>
    </>
  );
}
