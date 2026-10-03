# ファイル送信方式

バックエンドの `FILE_UPLOAD_MODE=server / presigned` に従って、アイコンとエビデンスの送信方式を切り替える。

送信前に計画APIを呼び、`server` は既存multipart API、`presigned` はストレージに直接PUTしてから完了APIを呼ぶ。通常APIは既存のCookie認証・CSRF対応のAPI clientを利用し、ストレージへのPUTはCookieを送らない。画面の送信状態、再試行、ユーザーキャッシュ更新は従来通り維持する。

バックエンドには計画・完了API、実容量・内容の再検証、利用者・用途・期限を限定するアップロード許可を実装する。仕様は `syncnesto-backend/docs/frontend-file-upload.md` を参照。OrvalはバックエンドのOpenAPIから再生成する。

フロントエンドへの追加環境変数は不要。公開時はストレージのCORSにフロントエンドのOriginを登録する。送信が途中で失敗した場合は完了登録せず、再試行で新しい計画を取得する。
