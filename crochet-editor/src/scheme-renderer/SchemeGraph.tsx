import { useCallback, useEffect, useRef } from "react";
import { D3Bindings, d3ForceManyBody, type InitialGraphData, type GraphNode, type GraphLink } from "./force-graph-rewrite/force-graph-d3-bindings";
import { GraphControllerCanvas2D } from "./force-graph-rewrite/force-graph-renderer";


const findNeighborsUpToDepth = (
  startNode: GraphNode,
  maxDepth: number,
): Set<GraphNode> => {
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


const stictchDistanceApprox = {
  direct: 1,
  chain: 2,
  crochet: 5,
  crochetSide: 1,
}

class GraphController {
  public readonly simulation: D3Bindings;

  constructor(graphSimulation: D3Bindings) {
    this.simulation = graphSimulation;
    this.updateLocalNeighborhoods(this.simulation.graph.value.links);

    const linkForce = this.simulation.createLinkForce("stitches");
    linkForce.distance((link) => stictchDistanceApprox[link.type] ?? 1);
    this.simulation.setForce("charge", d3ForceManyBody().strength(-30))
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

  public addLink(linkData: Partial<GraphLink>, nodeFrom: GraphNode, nodeTo: GraphNode): GraphLink {
    const newLink = {source: nodeFrom.id, target: nodeTo.id, ...linkData} as GraphLink;
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

class SchemaController {
  public readonly graphController: GraphController;
  public startStitchFocus: GraphNode;
  public targetStitchFocus: GraphNode;

  constructor(schemaView: GraphController) {
    this.graphController = schemaView;
    this.targetStitchFocus = this.graphController.simulation.graph.value.nodes.at(-1)!
    this.startStitchFocus = this.graphController.simulation.graph.value.nodes.at(-1)!
  }

  public getStartStitch() {
    return this.startStitchFocus;
  }
  public setStartStitch(node: GraphNode) {
    this.startStitchFocus = node;
  }
  public getTargetStitch() {
    return this.targetStitchFocus;
  }
  public setTargetStitch(node: GraphNode) {
    this.targetStitchFocus = node;
  }

  public addChainStitch() {
    const newNode = this.graphController.addNode({
      x: this.startStitchFocus.x + 10,
      y: this.startStitchFocus.y - 5 + 10 * Math.random(),
    });
    this.graphController.addLink({ type: "chain" }, this.startStitchFocus, newNode);
    this.setStartStitch(newNode);
  }

  public addDirectLinkStitch() {
    if (this.startStitchFocus === this.targetStitchFocus || this.startStitchFocus.links.some(l => l.source === this.targetStitchFocus || l.target === this.targetStitchFocus)) return;
    this.graphController.addLink({ type: "direct" }, this.startStitchFocus, this.targetStitchFocus);
  }

  public addCrochetStitch() {
    if (this.startStitchFocus === this.targetStitchFocus || this.startStitchFocus.links.some(l => l.source === this.targetStitchFocus || l.target === this.targetStitchFocus)) return;
    const newNode = this.graphController.addNode({
      x: this.startStitchFocus.x + 10,
      y: this.startStitchFocus.y - 5 + 10 * Math.random(),
    });
    this.graphController.addLink({ type: "crochet" }, newNode, this.targetStitchFocus);
    this.graphController.addLink({ type: "crochetSide" }, this.startStitchFocus, newNode);
  }
}


function configureRendering(controller: SchemaController, renderer: GraphControllerCanvas2D) {
  const fg = renderer.foregroundRender;

  const renderSelectedNodes = () => {
    const ctx = fg.canvasContext.value;
    const getStyle = fg.nodeStyle.value;

    ctx.save();

    for(const [node, color] of [
      [controller.startStitchFocus, "green"],
      [controller.targetStitchFocus, "red"],
    ] as [GraphNode, string][]) {

      const style = getStyle(node);
      if (!style.visible) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, style.relSize * 1.4, 0, 2 * Math.PI, false);
        ctx.strokeStyle = color; 
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  fg.tickSteps.setFunc(steps => [
    ...steps,
    renderSelectedNodes,
  ]);
}


export const EditorCanvas = ({className, inputData}: {
  className?: string
  inputData: InitialGraphData
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SchemaController>(undefined);
  const rendererRef = useRef<GraphControllerCanvas2D>(undefined);

  const getSize = useCallback(() => {
    if (!ref.current) return {
      width: 0,
      height: 0,
    };

    const style = getComputedStyle(ref.current);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const borderX = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const availableWidth = ref.current.offsetWidth - paddingX - borderX;
    const availableHeight = ref.current.offsetHeight - paddingY - borderY;

    return {
      width: availableWidth,
      height: availableHeight,
    };
  }, []);

  // One-time instantiation and configuration
  useEffect(() => {
    if (!ref.current) return; // Prevent re-instantiation

    const simulation = new D3Bindings(inputData);
    const controller = new SchemaController(new GraphController(simulation));
    const renderer = new GraphControllerCanvas2D(
      simulation,
      ref.current,
      getSize(),
    );

    controllerRef.current = controller;
    rendererRef.current = renderer;
    configureRendering(controller, renderer);

    // TODO: Ensure proper destruction
    // return () => {
    //   container.innerHTML = ""
    // }
  }, [inputData]);

  // Init view configuration
  useEffect(() => {
    if (!controllerRef.current) return;
    rendererRef.current?.dimensions.set(getSize());
  }, [getSize]);

  const onKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (!controllerRef.current) return;
      const controller = controllerRef.current;

      const isChangingTargetStitch = !ev.shiftKey;
      const currentNode = isChangingTargetStitch ? controller.getTargetStitch() : controller.getStartStitch();
      const moveByDirection = (dirX: number, dirY: number) => {
        const target = controller.graphController.getClosestByDirection(currentNode, dirX, dirY);
        console.log(dirX, dirY, target === currentNode);

        if (target === currentNode) return false;
        if (isChangingTargetStitch) {
          controller.setTargetStitch(target);
        } else {
          controller.setStartStitch(target);
        }
        return true;
      }

      // Ensure that user is moving somewhere in the same direction.
      if (ev.key === "ArrowUp") return moveByDirection(0, -1);
      if (ev.key === "ArrowDown") return moveByDirection(0, 1);

      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
        const movedStraight =
          (ev.key === "ArrowLeft" && moveByDirection(-1, 0)) ||
          (ev.key === "ArrowRight" && moveByDirection(1, 0));

        if (movedStraight) return true;

        const vecX = currentNode.x;
        const vecY = currentNode.y;

        const magnitude = Math.sqrt(vecX * vecX + vecY * vecY);
        if (magnitude === 0) return; // Avoid division by zero if exactly at center

        const unitVecX = vecX / magnitude;
        const unitVecY = vecY / magnitude;
        if (ev.key === "ArrowLeft") {
          return moveByDirection(unitVecY, -unitVecX);
        } else if (ev.key === "ArrowRight") {
          return moveByDirection(-unitVecY, unitVecX);
        }
      }

      if (ev.key === "c") {
        controller.addChainStitch()
      }

      // if (ev.key === "l") {
      //   controller.addLinkStitch()
      // }
    },
    [],
  );

  useEffect(() => {
    addEventListener("keydown", onKeyDown);
    return () => removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const onResize = useCallback(() => {
    if (!controllerRef.current) return;
    rendererRef.current?.dimensions.set(getSize());
  }, [getSize]);

  useEffect(() => {
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, [onResize]);

  return (
    <div ref={ref} className={className}></div>
  );
};
