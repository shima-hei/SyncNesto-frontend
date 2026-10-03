# GitHub Actionsからの本番デプロイ

`.github/workflows/ci-deploy.yml` はPRでformat・型・lint・Nodeテスト・本番依存の監査・buildを確認する。`main` へのpush、または `main` を指定した手動実行で、検証成功後にVercelへ本番デプロイする。

GitHubの `production` Environmentには次のSecretsを設定済み。Environmentのデプロイ可能なブランチは `main` に限定する。

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Vercel CLIは62.2.0、Node.jsは22。`vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` の順で実行し、公開ログイン画面のHTTP成功を確認する。DB・S3・アプリの共有キーはVercel側の環境変数で管理し、workflowのコードへ記載しない。PRでは本番Secretsを使用しない。

公開URL: https://syncnesto-portfolio.vercel.app

初回は対応するバックエンドPRを先に反映する。VercelのGit連携は無効のまま維持し、Actionsとの二重デプロイを避ける。Previewの自動デプロイは行わない。

[VercelのGitHub Actions手順](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
