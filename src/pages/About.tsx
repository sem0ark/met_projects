import { MarkdownRender } from "../components/Markdown";

export const About = () => {
  const graphContainer = document.getElementById("graph-container");
  if (graphContainer) graphContainer.hidden = true;

  return (
    <MarkdownRender filePath="/about.md" />
  )
}
