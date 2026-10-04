import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

type FormSubmitButtonProps = {
  children: React.ReactNode;
  isPending: boolean;
  disabled?: boolean;
};

export function FormSubmitButton({
  children,
  isPending,
  disabled = false,
}: FormSubmitButtonProps) {
  return (
    <Field>
      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? <Spinner data-icon="inline-start" /> : null}
        {children}
      </Button>
    </Field>
  );
}
