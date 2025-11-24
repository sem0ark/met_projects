import { useMemo, useState, useCallback, useRef, memo } from 'react';
import ForceGraph2D from 'force-graph';

type Node = {id: number}
type Link = {source: number; target: number}
type TreeNode = Node & { neighbors: Node[]; links: Link[]}

function genRandomTree(N = 300, reverse = false) {
  return {
    nodes: [...Array(N).keys()].map(i => ({ id: i })) as TreeNode[],
    links: [...Array(N).keys()]
      .filter(id => id)
      .map(id => ({
        [reverse ? 'target' : 'source']: id,
        [reverse ? 'source' : 'target']: Math.round(Math.random() * (id - 1))
      })) as Link[]
  };
}

const NODE_R = 8;

const HighlightGraph = memo(() => {
  const data = useMemo(() => {
    const gData = genRandomTree(80);

    gData.links.forEach(link => {
      const a = gData.nodes[link.source];
      const b = gData.nodes[link.target];
      if (!a.neighbors) a.neighbors = [];
      if (!b.neighbors) b.neighbors = [];
      a.neighbors.push(b);
      b.neighbors.push(a);

      !a.links && (a.links = []);
      !b.links && (b.links = []);
      a.links.push(link);
      b.links.push(link);
    });

    return gData;
  }, []);

  const [highlightNodes, setHighlightNodes] = useState<Set<number>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<Link>>(new Set());
  const [hoverNode, setHoverNode] = useState<TreeNode | null>(null);

  const updateHighlight = () => {
    setHighlightNodes(highlightNodes);
    setHighlightLinks(highlightLinks);
  };

  const handleNodeHover = (node?: TreeNode) => {
    highlightNodes.clear();
    highlightLinks.clear();
    if (node) {
      highlightNodes.add(node);
      node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
      node.links.forEach(link => highlightLinks.add(link));
    }

    setHoverNode(node ?? null);
    updateHighlight();
  };

  const handleLinkHover = (link?: Link) => {
    highlightNodes.clear();
    highlightLinks.clear();

    if (link) {
      highlightLinks.add(link);
      highlightNodes.add(link.source);
      highlightNodes.add(link.target);
    }

    updateHighlight();
  };

  const paintRing = useCallback((node, ctx) => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
    ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
    ctx.fill();
  }, [hoverNode]);

  const el = document.getElementById("tmp")!;
  const graph = new ForceGraph2D(el).linkDirectionalParticles(2).graphData(data).width(el.clientWidth).height(el.clientHeight)
  //   width={200}
  //   height={200}
  //   graphData={data}
  //   nodeRelSize={NODE_R}
  //   autoPauseRedraw={false}
  //   linkWidth={link => highlightLinks.has(link) ? 5 : 1}
  //   linkDirectionalParticles={4}
  //   linkDirectionalParticleWidth={link => highlightLinks.has(link) ? 4 : 0}
  //   nodeCanvasObjectMode={node => highlightNodes.has(node) ? 'before' : undefined}
  //   nodeCanvasObject={paintRing}
  // />

  return null;
})

export const Home = () => (
  <>
    <HighlightGraph />
  </>
)
