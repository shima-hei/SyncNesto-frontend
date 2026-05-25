export const VALIDATION_MESSAGES = {
  required: (label: string) => `${label}を入力してください。`,
  selectRequired: (label: string) => `${label}を選択してください。`,
  email: "メールアドレスの形式で入力してください。",
  emailInvalid: "メールアドレスの形式が正しくありません。",
  minLength: (label: string, min: number) =>
    `${label}は${min}文字以上で入力してください。`,
  optionalMinLength: (label: string, min: number) =>
    `${label}を変更する場合は${min}文字以上で入力してください。`,
  number: (label: string) => `${label}は数値で入力してください。`,
  imageFileType: "PNG、JPEG、WebP の画像を選択してください。",
  imageFileSize: (maxSizeLabel: string) =>
    `画像サイズは${maxSizeLabel}以下にしてください。`,
  imageRequired: "画像を選択してください。",
  confirmInput: "入力内容を確認してください。",
} as const;
