import {
  approveEmailChangeAuthEmailChangeApprovePost,
  confirmEmailChangeAuthEmailChangeConfirmPost,
  confirmPasswordResetAuthPasswordResetConfirmPost,
  inspectAccountActionAuthAccountActionsInspectPost,
  requestMyEmailChangeAuthEmailChangeRequestPost,
  requestPasswordResetAuthPasswordResetRequestPost,
} from "@/lib/api/generated/account-actions/account-actions";

export const accountActionApi = {
  inspect: inspectAccountActionAuthAccountActionsInspectPost,
  requestPasswordReset: requestPasswordResetAuthPasswordResetRequestPost,
  confirmPasswordReset: confirmPasswordResetAuthPasswordResetConfirmPost,
  requestEmailChange: requestMyEmailChangeAuthEmailChangeRequestPost,
  approveEmailChange: approveEmailChangeAuthEmailChangeApprovePost,
  confirmEmailChange: confirmEmailChangeAuthEmailChangeConfirmPost,
};

export type AccountActionInspection = Awaited<
  ReturnType<typeof accountActionApi.inspect>
>;
