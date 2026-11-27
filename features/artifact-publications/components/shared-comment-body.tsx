import { Fragment } from "react";
import Link from "next/link";
import { CommentContent } from "@/components/shared/comments/comment-content";
import type {
  CommentMentionText,
  SharedPublicationLinkTitle,
} from "@/lib/api/generated/model";
import { editorLinks } from "@/lib/smart-links/editor-links";
import { sharedPublicationLinkId } from "@/lib/smart-links/reference";

export function SharedCommentBody({
  body,
  mentions,
  titles,
  internal,
}: {
  body: string;
  mentions?: CommentMentionText[];
  titles: SharedPublicationLinkTitle[];
  internal?: boolean;
}) {
  return (
    <p className="text-sm leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">
      <CommentContent
        body={body}
        mentions={mentions}
        renderText={
          internal
            ? undefined
            : (text) => <AuthorizedLinks text={text} titles={titles} />
        }
      />
    </p>
  );
}

function AuthorizedLinks({
  text,
  titles,
}: {
  text: string;
  titles: SharedPublicationLinkTitle[];
}) {
  const origin = window.location.origin;
  const links = editorLinks(text, true);
  const elements = links.map((link, index) => {
    const before = text.slice(links[index - 1]?.end ?? 0, link.start);
    const target = sharedPublicationLinkId(link.href, origin);
    const match = target && titles.find((item) => item.id === target);
    const external =
      !target &&
      URL.canParse(link.href) &&
      new URL(link.href).origin !== origin;
    const label = link.display === "auto" && match ? match.title : link.text;
    return (
      <Fragment key={link.start}>
        {before}
        {match ? (
          <Link
            href={link.href}
            prefetch={false}
            className="text-primary underline underline-offset-4"
          >
            {label}
          </Link>
        ) : external ? (
          <a
            href={link.href}
            rel="noreferrer"
            className="text-primary underline underline-offset-4"
          >
            {label}
          </a>
        ) : (
          label
        )}
      </Fragment>
    );
  });
  return (
    <>
      {elements}
      {text.slice(links.at(-1)?.end ?? 0)}
    </>
  );
}
