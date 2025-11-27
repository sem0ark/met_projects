import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export const MarkdownRender = ({
  filePath,
  markdownText,
}: {
  filePath?: string;
  markdownText?: string;
}) => {
  const [markdownContent, setMarkdownContent] = useState(markdownText ?? "");
  useEffect(() => {
    if (!filePath) return;

    fetch(filePath)
      .then((response) => response.text())
      .then((text) => setMarkdownContent(text))
      .catch((error) => console.error("Failed to fetch markdown:", error));
  }, [filePath]);

  return (
    <article className="w-full justify-center prose prose-neutral lg:prose-xl prose-img:size-4 prose-img:inline prose-img:align-text-bottom prose-img:m-0 prose-img:ml-1 prose-a:text-blue-600">
      {<ReactMarkdown>{markdownContent}</ReactMarkdown>}
    </article>
  );
};
