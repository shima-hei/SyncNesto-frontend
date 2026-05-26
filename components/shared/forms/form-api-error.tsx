import { FieldError } from "@/components/ui/field";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";

type FormApiErrorProps = {
  error?: Error | null;
  fallbackMessage?: string;
};

export function FormApiError({ error, fallbackMessage }: FormApiErrorProps) {
  if (!error) {
    return null;
  }

  return <FieldError>{getApiErrorMessage(error, fallbackMessage)}</FieldError>;
}
