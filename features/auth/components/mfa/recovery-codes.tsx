"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";

export function RecoveryCodes({
  codes,
  onContinue,
  busy = false,
}: {
  codes: string[] | null | undefined;
  onContinue: () => void;
  busy?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        復旧コードは各1回だけ使用できます。認証アプリや端末とは別の、安全な場所へ保存してください。再表示はできません。
      </p>
      {codes?.length ? (
        <>
          <ul
            aria-label="復旧コード"
            className="flex flex-col gap-1 rounded-md border bg-muted p-3 font-mono text-xs sm:text-sm"
          >
            {codes.map((code) => (
              <li key={code} className="break-all select-all">
                {code}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob(["Syncnesto 復旧コード\n\n" + codes.join("\n")], {
                  type: "text/plain;charset=utf-8",
                }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = "syncnesto-recovery-codes.txt";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            復旧コードを保存
          </Button>
          <Field orientation="horizontal">
            <Checkbox
              id="mfa-codes-saved"
              checked={saved}
              onCheckedChange={(checked) => setSaved(checked === true)}
            />
            <FieldLabel htmlFor="mfa-codes-saved">
              安全な場所へ保存しました
            </FieldLabel>
          </Field>
        </>
      ) : (
        <p className="text-sm">
          画面を再読み込みしたため、コードを再表示できません。登録完了後にアカウント画面で再発行してください。
        </p>
      )}
      <Button
        disabled={busy || (Boolean(codes?.length) && !saved)}
        onClick={onContinue}
      >
        登録を完了する
      </Button>
    </div>
  );
}
