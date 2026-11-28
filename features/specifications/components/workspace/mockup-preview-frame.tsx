export function MockupPreviewFrame({
  document,
  width = 1024,
  height = 650,
}: {
  document: string;
  width?: number;
  height?: number;
}) {
  return (
    <iframe
      title="HTMLモックアップの隔離プレビュー"
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={document}
      className="block bg-white"
      width={width}
      height={height}
    />
  );
}
