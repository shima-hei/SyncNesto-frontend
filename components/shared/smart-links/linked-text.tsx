import { Fragment, type ReactNode } from "react";
import { editorLinks } from "@/lib/smart-links/editor-links";
import { SmartLink } from "./smart-link";

const renderPlain = (text: string): ReactNode => text;

export function LinkedText({
  text,
  liveLinks = true,
  renderText = renderPlain,
}: {
  text: string;
  liveLinks?: boolean;
  renderText?: (text: string) => ReactNode;
}) {
  const links = editorLinks(text);
  return (
    <>
      {links.map((link, index) => {
        const before = text.slice(links[index - 1]?.end ?? 0, link.start);
        return (
          <Fragment key={`${link.start}:${link.href}`}>
            {renderText(before)}
            <SmartLink
              href={link.href}
              display={link.display}
              live={liveLinks}
              source={text.slice(link.start, link.end)}
            >
              {renderText(link.text)}
            </SmartLink>
          </Fragment>
        );
      })}
      {renderText(text.slice(links.at(-1)?.end ?? 0))}
    </>
  );
}
