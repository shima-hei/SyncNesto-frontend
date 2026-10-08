import { SearchPage } from "@/features/search/components/pages/search-page";
import { readSearchState, searchHref } from "@/features/search/lib/search";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = readSearchState(await searchParams);
  return <SearchPage key={searchHref(state)} state={state} />;
}
