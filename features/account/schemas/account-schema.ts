import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const accountProfileSchema = z.object({
  name: z.string().min(1, VALIDATION_MESSAGES.required("名前")),
});
