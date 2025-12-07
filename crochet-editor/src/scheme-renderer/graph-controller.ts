import { D3Bindings, type GraphNode, type GraphLink } from "./force-graph-rewrite/force-graph-d3-bindings";

function findNeighborsUpToDepth(
  startNode: GraphNode,
  maxDepth: number,
): Set<GraphNode> {
  const visited = new Set<GraphNode>();
  const queue: { node: GraphNode; depth: number }[] = [
    { node: startNode, depth: 0 },
  ];

  visited.add(startNode);

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!; // Dequeue

    if (depth >= maxDepth) continue;

    for (const neighbor of node.neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, depth: depth + 1 });
      }
    }
  }

  visited.delete(startNode);
  return visited;
};

export class GraphController {
  public readonly simulation: D3Bindings;

  constructor(graphSimulation: D3Bindings) {
    this.simulation = graphSimulation;
    this.updateLocalNeighborhoods(this.simulation.graph.value.links);
  }

  public getClosestByDirection(currentNode: GraphNode, dirX: number, dirY: number): GraphNode {
    if (!this.simulation) return currentNode;
    const neighbors = findNeighborsUpToDepth(currentNode, 4);
    const directionTolerance = Math.cos(Math.PI / 4);

    let bestMatch: GraphNode = currentNode;
    let minDistanceSq: number = Infinity;

    for (const neighbor of neighbors) {
      if (neighbor.x !== 0 && !neighbor.x || !neighbor.y) continue;
      const dx = neighbor.x - currentNode.x;
      const dy = neighbor.y - currentNode.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq === 0) continue;
      const dotProduct = dx * dirX + dy * dirY;

      if (dotProduct > directionTolerance * Math.sqrt(distanceSq) && distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        bestMatch = neighbor;
      }
    }

    return bestMatch;
  }

  public updateLocalNeighborhoods(links: GraphLink[]) {
    for(const link of links) {
      link.source.neighbors = link.source.neighbors ?? [];
      link.target.neighbors = link.target.neighbors ?? [];
      link.source.links = link.source.links ?? [];
      link.target.links = link.target.links ?? [];

      link.source.neighbors.push(link.target);
      link.target.neighbors.push(link.source);
      link.source.links.push(link);
      link.target.links.push(link);
    }
  }

  private cleanupLocalNeighborhoods(linksToRemove: GraphLink[]) {
    for(const link of linksToRemove) {
      // For each link, update its source and target nodes' neighborhood arrays
      const source = link.source;
      const target = link.target;

      source.neighbors = source.neighbors.filter(n => n.id !== target.id);
      source.links = source.links.filter(l => l.id !== link.id);
      target.neighbors = target.neighbors.filter(n => n.id !== source.id);
      target.links = target.links.filter(l => l.id !== link.id);
    }
  }

  public removeNode(nodeId: number): GraphNode | undefined {
    const data = this.simulation.graph.value;

    const nodeIndex = data.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return undefined; // Node not found
    }

    const removedNode: GraphNode = data.nodes[nodeIndex];
    const linksToRemove: GraphLink[] = [...removedNode.links];

    this.cleanupLocalNeighborhoods(linksToRemove);
    let nRemoved = 0;
    for (let i = data.links.length - 1; i >= 0 || nRemoved < linksToRemove.length; i--) {
      if (linksToRemove.some(l => l.id === data.links[i].id)) {
        data.links.splice(i, 1);
        nRemoved += 1;
      }
    }

    data.nodes.splice(nodeIndex, 1);
    this.simulation.graph.triggerChange();
    return removedNode;
  }

  public removeLastNode(): GraphNode | undefined {
    const data = this.simulation.graph.value;
    if (data.nodes.length === 0) {
      return undefined; // No nodes to remove
    }

    const removedNode: GraphNode = data.nodes.pop()!;
    if (!removedNode) return undefined;

    const linksToRemove: GraphLink[] = [...removedNode.links];

    this.cleanupLocalNeighborhoods(linksToRemove);
    let nRemoved = 0;
    for (let i = data.links.length - 1; i >= 0 || nRemoved < linksToRemove.length; i--) {
      if (linksToRemove.some(l => l.id === data.links[i].id)) {
        data.links.splice(i, 1);
        nRemoved += 1;
      }
    }

    this.simulation.graph.triggerChange();
    return removedNode;
  }

  public removeLink(linkId: number): GraphLink | undefined {
    const data = this.simulation.graph.value;
    const linkIndex = data.links.findIndex(link => link.id === linkId);
    if (linkIndex === -1) {
      return undefined;
    }

    const removedLink: GraphLink = data.links[linkIndex];
    this.cleanupLocalNeighborhoods([removedLink]);
    data.links.splice(linkIndex, 1);

    this.simulation.graph.triggerChange();
    return removedLink;
  }

  public removeLastLink(): GraphLink | undefined {
    const data = this.simulation.graph.value;
    if (data.links.length === 0) {
      return undefined; // No links to remove
    }

    const removedLink: GraphLink = data.links.pop()!;
    this.cleanupLocalNeighborhoods([removedLink]);
    this.simulation.graph.triggerChange();
    return removedLink;
  }

  public addLink(linkData: Partial<GraphLink>, nodeFrom: GraphNode, nodeTo: GraphNode): GraphLink {
    const newLink = {source: nodeFrom, target: nodeTo, ...linkData} as GraphLink;
    this.simulation.graph.setFunc((data) => {
      data.links.push(newLink);
      return data;
    });

    this.updateLocalNeighborhoods([newLink]);
    return newLink;
  }

  public addNode(nodeData: Partial<GraphNode>): GraphNode {
    const newId = this.simulation.graph.value.nodes.length;
    const newNode = {...nodeData, id: newId} as GraphNode;

    this.simulation.graph.setFunc((data) => {
      data.nodes.push(newNode);
      return data;
    });

    return newNode;
  }
}