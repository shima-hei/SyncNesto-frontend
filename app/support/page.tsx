import type { Metadata } from "next";
import {
  PublicInformationPage,
  PublicInformationSection,
} from "@/components/shared/public/public-information-page";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "Syncnestoの操作、不具合、個人情報の取扱いに関するお問い合わせ窓口。",
};

export default function SupportPage() {
  return (
    <PublicInformationPage
      path="/support"
      title="お問い合わせ"
      description="操作、不具合、個人情報の取扱いについて、メールでお問い合わせください。ログインは不要です。"
    >
      <PublicInformationSection title="連絡先">
        <p>
          <a href="mailto:syncnesto@gmail.com">syncnesto@gmail.com</a>
        </p>
        <p>
          運営者は shime-hei
          です。個人のポートフォリオとして運営しているため、返信までの日数や継続的なサポートは保証していません。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="不具合・操作の相談">
        <p>
          発生日時、操作していた画面、期待した結果と実際の結果をお知らせください。画面の画像を添える場合は、個人情報や認証情報を隠してください。
        </p>
        <p>
          パスワード、認証コード、復旧コード、アクセストークン、接続文字列、本人確認書類、実業務の機密情報は送らないでください。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="個人情報・削除の相談">
        <p>
          情報の確認、訂正、利用停止、削除についても同じ窓口で受け付けます。対象のアカウントと希望する対応をお知らせください。本人確認の方法や追加で必要な事項はこちらから案内します。
        </p>
        <p>
          パスワードやMFAコードを本人確認のために尋ねることはありません。ほかの利用者の権利、安全対策、法令上の必要性を確認し、個別に対応します。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="セキュリティ上の問題">
        <p>
          問題を見つけた場合は、影響する画面・操作と、架空のサンプルを使った再現手順をご連絡ください。ほかの利用者の情報の取得、権限の迂回、破壊的な検証、過剰な負荷を伴う検証は行わないでください。
        </p>
      </PublicInformationSection>
      <PublicInformationSection title="提供範囲">
        <p>
          Syncnestoは無料のポートフォリオ試用環境です。通常アカウントは運営者の招待制で、業務データには架空のサンプルのみを登録できます。利用条件と情報の取扱いは、利用規約とプライバシーポリシーをご確認ください。
        </p>
      </PublicInformationSection>
    </PublicInformationPage>
  );
}
