"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { RequirementReviewRead } from "@/lib/api/generated/model";

import { REQUIREMENT_REVIEW_STATUS_OPTIONS } from "../../constants/requirement-options";
import { requirementReviewSchema } from "../../schemas/requirement-schema";
import type {
  RequirementReviewFormErrors,
  RequirementReviewFormValues,
} from "../../types/requirement-review-form";

type RequirementReviewFormProps = {
  mode: "create" | "update";
  initialValues?: RequirementReviewFormValues;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementReviewFormValues) => Promise<unknown>;
};

export function RequirementReviewForm({
  mode,
  initialValues = initialReviewValues,
  isPending,
  error,
  onSubmit,
}: RequirementReviewFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementReviewFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = requirementReviewSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        reviewerId: fieldErrors.reviewerId?.[0],
        status: fieldErrors.status?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => {
        if (mode === "create") {
          setValues(initialReviewValues);
        }
      })
      .catch(() => undefined);
  };

  const updateValue = <TKey extends keyof RequirementReviewFormValues>(
    field: TKey,
    value: RequirementReviewFormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-3 md:grid-cols-[160px_180px_1fr]">
          <Field data-invalid={errors.reviewerId ? true : undefined}>
            <FieldLabel>レビュー担当ID</FieldLabel>
            <Input
              inputMode="numeric"
              value={values.reviewerId}
              onChange={(event) => updateValue("reviewerId", event.target.value)}
              aria-invalid={Boolean(errors.reviewerId)}
            />
            {errors.reviewerId ? (
              <FieldError>{errors.reviewerId}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={errors.status ? true : undefined}>
            <FieldLabel>ステータス</FieldLabel>
            <Select
              value={values.status}
              onValueChange={(value) => updateValue("status", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ステータスを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REQUIREMENT_REVIEW_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.status ? <FieldError>{errors.status}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel>レビュー日時</FieldLabel>
            <Input
              type="datetime-local"
              value={values.reviewedAt}
              onChange={(event) => updateValue("reviewedAt", event.target.value)}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>コメント</FieldLabel>
          <Textarea
            value={values.comment}
            onChange={(event) => updateValue("comment", event.target.value)}
          />
        </Field>
        {error ? <FieldError>{error.message}</FieldError> : null}
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {mode === "create" ? "レビュー追加" : "レビュー更新"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

export const getRequirementReviewFormValues = (
  review: RequirementReviewRead
): RequirementReviewFormValues => {
  return {
    reviewerId: String(review.reviewer_id),
    status: review.status,
    comment: review.comment ?? "",
    reviewedAt: review.reviewed_at ? review.reviewed_at.slice(0, 16) : "",
  };
};

const initialReviewValues: RequirementReviewFormValues = {
  reviewerId: "",
  status: "pending",
  comment: "",
  reviewedAt: "",
};
