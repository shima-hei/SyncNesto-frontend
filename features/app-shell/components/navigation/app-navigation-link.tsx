import type { ComponentProps } from "react";

export function AppNavigationLink(props: ComponentProps<"a">) {
  // 画面側の beforeunload が未保存入力を保護できるよう通常のリンクを使う。
  return <a {...props} />;
}
