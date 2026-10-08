# GitHub Actionsからの本番デプロイ

`.github/workflows/ci-deploy.yml` はPRでformat・型・lint・Nodeテスト・本番依存の監査・build・実際のProduction HTMLのCSPを確認する。`main` へのpush、または `main` を指定した手動実行で、検証成功後にVercelへ本番デプロイする。

`npm run security:check` はbuild済みアプリをローカルで起動し、リクエストごとに異なる
nonce、全SSR scriptとテーマ初期化scriptのnonce、外部ヘッダーの偽装拒否、HTMLの
`private, no-store` を検証する。APIやストレージの接続先・資格情報は不要。
独自ポートが必要なら `CSP_TEST_PORT` を指定する。

ページには `script-src` のnonceと `strict-dynamic` を適用する。
Productionで `unsafe-inline` / `unsafe-eval` は許可しない。
既存のinline style・MermaidのSVG・ファイルの接続先はこの段階では制限を追加しない。
root layoutでrequest headersを読むため、ページは動的描画になる。nonceを含むHTMLに
静的生成・ISR・共有CDN cacheを適用しない。Next.jsやテーマscriptを追加する場合は
CSP検証も更新する。

依存更新は `.github/dependabot.yml`、コード変更がない間の既知脆弱性確認は
`.github/workflows/dependency-audit.yml` の週次実行で行う。
週次workflowはデプロイを行わない。本番依存はlow以上を検出すると失敗し、開発依存はhigh以上で失敗する。
2026-10-07時点で開発用 `braces` の
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) は修正版が未公開。
9件の依存エントリーとして監査に残るため、開発依存の週次監査はこの残件でも失敗する。
利用者入力をglob patternとしてCLIやlintへ渡さず、サードパーティの設定・OpenAPIを
資格情報を持つ環境で実行しない。警告を無視する設定は追加しない。

MermaidのKaTeXは修正版0.18.2、source-map-jsは1.2.2以上にoverrideする。
上流が修正版を要求するようになったらoverrideを外し、描画とCSPを再確認する。

`.npmrc` の `ignore-scripts=true` とCIの `npm ci --ignore-scripts` で、依存packageの
install lifecycle scriptを自動実行しない。明示した `npm run build` などは実行できる。
現在のbuildとOrvalはこの設定で確認する。将来の依存がinstall scriptを必要とする場合は、
package・固定version・必要性を確認してから個別に対応し、全体の制限を外さない。

GitHubの `production` Environmentには次のSecretsを設定済み。Environmentのデプロイ可能なブランチは `main` に限定する。

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Vercel CLIは62.2.0、Node.jsは22。`vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` の順で実行し、公開ログイン画面のHTTP成功を確認する。DB・S3・アプリの共有キーはVercel側の環境変数で管理し、workflowのコードへ記載しない。PRでは本番Secretsを使用しない。

公開URL: https://syncnesto.vercel.app

公開ドメインはinfraの `vercel_project_domain.frontend` で管理し、Productionデプロイへ自動割り当てする。VercelのプロジェクトIDとActionsのSecretsはそのまま使用する。

初回は対応するバックエンドPRを先に反映する。VercelのGit連携は無効のまま維持し、Actionsとの二重デプロイを避ける。Previewの自動デプロイは行わない。

[VercelのGitHub Actions手順](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)

## デモ環境

BackendとFrontendはともに`APP_ENV=production`を維持し、server専用`DEMO_MODE=true`でデモを有効にする。
FrontendのServer Componentがフラグを読み、登録不要のデモ開始操作を表示する。
`DEMO_MODE`は未設定時false。`NEXT_PUBLIC_*`にはせず、BackendがAPIの可否を最終判定する。
Backendには専用DB・非公開バケット・回収用秘密が必要。
デモ下書きはメモリだけに保持し、ログアウト・リセット・失効で破棄する。
更新の完了前にページを再読み込みした場合も未保存下書きは消える。
Backendの`docs/portfolio-demo.md`にAPI・回収・公開切り替え条件を記載する。

### 決定記録（2026-10-08）

当初の`APP_ENV=production` + `DEMO_MODE=true`という提案に対し、実装・手順が`APP_ENV=demo`にずれていたため修正した。
環境と機能を分離する決定・作業・検証記録はBackendの`docs/decisions/2026-10-08-demo-mode.md`を正とする。
今回の修正はAPIの入出力や生成クライアントを変更しない。公開設定変更とデモ有効化は別作業として記録する。
ローカルでは既存63件・format・型・lint・本番buildが成功し、未設定／false／trueでの表示切り替えと通常・デモ両方のCSPを確認した。公開反映・GitHub CIは未実施。
