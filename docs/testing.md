# テストの実行と診断

## Codex / MCPの実トークン計測

```bash
node scripts/measure-mcp-usage.mjs --source <現在の会話のrollout.jsonl> --output .verify/mcp-usage.json
# 作業開始以降の複数turnを含む区間
node scripts/measure-mcp-usage.mjs --source <rollout.jsonl> --since <ISO時刻> --output .verify/mcp-usage.json
```

現在のCodex desktopが記録する `token_usage_record` をresponse IDで重複除去し、最新turn（または指定区間）の実測を集計する。入力にはキャッシュ入力を含み、出力には推論を含むため二重加算しない。`observed_through` までのスナップショットであり、実行中の最後の応答はまだ含まれない。形式が変わって取得できない場合は `unavailable` とし、推定値で埋めない。

本文・引数・出力・認証情報は保存せず、ネットワーク送信・追加モデル実行・新依存もない。execコード内のMCP参照は実際の内部RPC数ではない。取得できる実トークンはモデル処理全体で、MCP単独のトークン、ChatGPT利用枠への換算、API料金への換算は行わない。JSON bytesの減少も実トークン削減率とは呼ばない。

根拠：[Codexのusage出力](https://learn.chatgpt.com/docs/non-interactive-mode)、[OpenAIのツールを含むトークン計数](https://developers.openai.com/api/docs/guides/token-counting)。ローカルrolloutのレコード形式自体は現物確認した実装依存で、公式の安定APIとは扱わない。

## テスト実行

```bash
npm test
npm test -- --reuse
npm test -- --test-name-pattern='対象の名前'
```

既存Node標準ランナーと全ファイルの自動探索を維持する。新しいテストフレームワークや依存はない。成功は短いJSONとログの場所だけを表示し、失敗は先頭3件を表示する。`.verify/test-*/full.log` は標準spec reporterの完全ログ、`result.json` は全失敗のstack/cause・件数・時間。終了コードと最終summaryの両方が成功で、実行件数が1以上の場合だけ成功にする。120秒timeout・中断・結果欠落・破損も非0で終了する。

`--reuse` は明示したローカルだけで1時間以内の成功を再利用する。Git管理対象と未追跡ファイルの内容、削除、lock、Node version、実行引数、環境変数（値は記録しない）、ローカルdotenv、インストール済みlockをSHA256で照合する。CI、失敗、未完了は再利用しない。外部要因/環境の不整合を疑う場合は再利用しない。`--raw` は従来の表示で診断/比較するためのオプションで、再利用結果は作らない。

全体テストは短いため差分選択用ツールを追加しない。PRは既存のformat/typecheck/lint/test/build/CSP/依存監査を維持する。旧実行の中断はPRのみ。CIは成功/失敗とも完全ログとJSONを7日artifact保存する。通常のローカル作業では各検証の成功を記録し、変更や新しい懸念がない限り同じ検証を繰り返さない。
