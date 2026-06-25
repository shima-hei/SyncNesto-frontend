import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CommentInlineHeader({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <Button type="button" variant="outline" size="sm" onClick={onClose}>
        <XIcon data-icon="inline-start" />
        閉じる
      </Button>
    </div>
  );
}
