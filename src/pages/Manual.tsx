import { MarkdownRender } from "../components/Markdown";

export const Manual = () => {
  const graphContainer = document.getElementById("graph-container");
  if (graphContainer) graphContainer.hidden = true;

  return (
    <MarkdownRender filePath="/manual.md" />
  )
}
