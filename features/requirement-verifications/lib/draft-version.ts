export function verificationDraftScope(
  tenantId: number | undefined,
  planId: string,
  version: number,
) {
  return `tenant:${tenantId}:verification:${planId}:version:${version}`;
}

export function readDraftVersion(
  raw: string | null,
  current: number,
): number | null {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value < current ? value : null;
}
