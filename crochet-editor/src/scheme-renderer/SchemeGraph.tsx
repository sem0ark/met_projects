import { useCallback, useEffect, useRef } from "react";
import { D3Bindings, type InitialGraphData, type GraphNode, type GraphLink, d3ForceCollide, d3ForceManyBody } from "./force-graph-rewrite/d3-bindings";
import { GraphControllerCanvas2D } from "./force-graph-rewrite/canvas-controller";
import { GraphController } from "./graph-controller";
import type { NodeStyle, LinkStyle } from "./force-graph-rewrite/canvas-render";

type NodeData = {
  type: string;
  radius: number;
  style: NodeStyle;
};
type LinkData = {
  type: string;
  strength: number;
  distance: number;
  style: LinkStyle;
};

const BEGIN_NODE: NodeData = {
  type: "begin",
  radius: 0,

  style: {
    visible: true,
    color: "black",
    relSize: 3,

    drawNodeFn: (ctx: CanvasRenderingContext2D, node: GraphNode, style: NodeStyle, globalScale: number) => {
      const link = node.links.find(link => link.source === node);
      const rawdx = link ? link.target.x - link.source.x : 5;
      const rawdy = link ? link.target.y - link.source.y : 0;
      const dist = Math.sqrt(rawdx * rawdx + rawdy * rawdy);

      const dx = rawdx / dist;
      const dy = rawdy / dist;

      ctx.beginPath();
      const r = style.relSize;
      ctx.moveTo(node.x + dy * r - dx * r, node.y - dx * r - dy * r);
      ctx.lineTo(node.x - dy * r - dx * r, node.y + dx * r - dy * r);
      ctx.lineTo(node.x + dx * r * 2, node.y + dy * r * 2);

      ctx.lineWidth = 1 / globalScale;
      ctx.fillStyle = style.color;
      ctx.closePath();
      ctx.fill();
    }
  },
}

const DIRECT_LINK: LinkData = {
  type: "direct",
  strength: 1,
  distance: 10,

  style: {
    visible: true,
    color: "black",
    lineDash: [],
    width: 1,
    curvature: 0,

    drawLinkFn: (ctx, link, style) => {
      const midx = (link.source.x + link.target.x) / 2;
      const midy = (link.source.y + link.target.y) / 2;

      ctx.beginPath();
      ctx.arc(midx, midy, 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = style.color;
      ctx.fill();      
    },
  },
}

const CHAIN_NODE: NodeData = {
  type: "chain",
  radius: 5,

  style: {
    visible: true,
    color: "black",
    relSize: 5,

    drawNodeFn: (ctx: CanvasRenderingContext2D, node: GraphNode, style: NodeStyle, globalScale: number) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
      ctx.fillStyle = style.color;
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }
  },
}

const CHAIN_LINK: LinkData = {
  type: "chain",
  strength: 1,
  distance: 10,
  style: {
    visible: false,
    color: "",
    lineDash: [],
    width: 0,
    curvature: 0,
  },
}

const CROCHET_NODE: NodeData = {
  type: "crochet",
  radius: 5,

  style: {
    visible: true,
    color: "black",
    relSize: 5,

    drawNodeFn: (ctx: CanvasRenderingContext2D, node: GraphNode, style: NodeStyle, globalScale: number) => {
      const stem = node.links.find(link => link.source === node);
      const rawdx = stem ? stem.target.x - stem.source.x : 5;
      const rawdy = stem ? stem.target.y - stem.source.y : 0;
      const dist = Math.sqrt(rawdx * rawdx + rawdy * rawdy);

      const dx = rawdx / dist;
      const dy = rawdy / dist;
      const r = style.relSize;

      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.moveTo(node.x + dy * r, node.y - dx * r);
      ctx.lineTo(node.x - dy * r, node.y + dx * r);

      ctx.strokeStyle = style.color;
      ctx.lineWidth = 3 / globalScale;
      ctx.stroke();
    }
  },
}

const CROCHET_LINK_STEM: LinkData = {
  type: "crochet-stem",
  strength: 1,
  distance: 10,
  style: {
    visible: true,
    color: "black",
    width: 3,
    
    drawLinkFn: (ctx: CanvasRenderingContext2D, link: GraphLink, style: LinkStyle, globalScale: number) => {
      const rawdx = link.target.x - link.source.x;
      const rawdy = link.target.y - link.source.y;
      const dist = Math.sqrt(rawdx * rawdx + rawdy * rawdy);

      const dx = rawdx / dist;
      const dy = rawdy / dist;

      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.source.x + dx * 6, link.source.y + dy * 6);

      ctx.strokeStyle = style.color;
      ctx.lineWidth = 3 / globalScale;
      ctx.stroke();
    }
  },
}

const CROCHET_LINK_SIDE: LinkData = {
  type: "crochet-side",
  strength: 1,
  distance: 10,
  style: {
    visible: false,
    color: "",
    lineDash: [],
    width: 0,
    curvature: 0,
  },
}

interface Action {
  execute(): void;
  undo(): void;
}

class AddNodeAction implements Action {
  
  private graphController: GraphController;
  private nodeData: Partial<GraphNode>;
  public createdNode?: GraphNode = undefined;

  constructor(
    graphController: GraphController,
    nodeData: Partial<GraphNode>,
  ) {
    this.graphController = graphController;
    this.nodeData = nodeData;
  }

  execute(): void {
    this.createdNode = this.graphController.addNode(this.nodeData);
  }

  undo(): void {
    if (this.createdNode) {
      this.graphController.removeNode(this.createdNode.id);
    }
  }
}

class AddLinkAction implements Action {
  private graphController: GraphController;
  private linkData: Partial<GraphLink>;
  private sourceNode: GraphNode;
  private targetNode: GraphNode;
  private createdLink?: GraphLink = undefined;

  constructor(
    graphController: GraphController,
    linkData: Partial<GraphLink>,
    sourceNode: GraphNode,
    targetNode: GraphNode,
  ) {
    this.graphController = graphController;
    this.linkData = linkData;
    this.sourceNode = sourceNode;
    this.targetNode = targetNode;
  }

  execute(): void {
    this.createdLink = this.graphController.addLink(this.linkData, this.sourceNode, this.targetNode);
  }

  undo(): void {
    if (this.createdLink) {
      this.graphController.removeLink(this.createdLink.id);
    }
  }
}

class CompositeAction implements Action {
  private actions: Action[] = [];

  addAction(action: Action): CompositeAction {
    this.actions.push(action);
    return this;
  }

  execute(): void {
    this.actions.forEach(action => action.execute());
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo();
    }
  }
}

class SchemaController {
  public readonly graph: GraphController;
  public startStitchFocus: GraphNode;
  public targetStitchFocus: GraphNode;

  private startStitchHistory: GraphNode[] = [];
  private actionHistory: Action[] = [];
  private redoStack: Action[] = [];

  constructor(controller: GraphController) {
    this.graph = controller;
    this.targetStitchFocus = controller.simulation.graph.value.nodes.at(-1)!
    this.startStitchFocus = controller.simulation.graph.value.nodes.at(-1)!

    Object.assign(this.targetStitchFocus, BEGIN_NODE, { neighbors: [], links: [] });

    const linkForce = controller.simulation.createLinkForce("stitches");
    linkForce
      .strength((link) => (link as GraphLink & LinkData).strength ?? 1)
      .distance((link) => (link as GraphLink & LinkData).distance ?? 1);

    controller.simulation.setForce("collision", d3ForceCollide().radius((node) => (node as GraphNode & NodeData).radius))
    controller.simulation.setForce("charge", d3ForceManyBody().strength(-5).distanceMax(200))
  }

  public getStartStitch() {
    return this.startStitchFocus;
  }

  public setStartStitch(node: GraphNode) {
    this.startStitchHistory.push(this.startStitchFocus);
    if (this.startStitchHistory.length > 2) {
      this.startStitchHistory.shift();
    }
    this.startStitchFocus = node;
  }

  public getTargetStitch() {
    return this.targetStitchFocus;
  }

  public setTargetStitch(node: GraphNode) {
    this.targetStitchFocus = node;
  }

  private calculateShift() {
    if (this.startStitchHistory.length < 2) {
      return { x: 1, y: 0 };
    }

    const prev1 = this.startStitchHistory.at(-2)!;
    const prev2 = this.startStitchHistory.at(-1)!;
    const dx = prev2.x - prev1.x;
    const dy = prev2.y - prev1.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    return {
      x: dx / dist,
      y: dy / dist,
    };
  }

  private recordAction(action: Action) {
    this.actionHistory.push(action);
    this.redoStack = [];
  }

  public undoLastAction() {
    if (this.actionHistory.length === 0) return;
    const lastAction = this.actionHistory.pop();
    if (lastAction) {
      lastAction.undo();
      this.redoStack.push(lastAction);
    }
  }

  public redoLastAction() {
    if (this.redoStack.length === 0) return;
    const actionToRedo = this.redoStack.pop();
    if (actionToRedo) {
      actionToRedo.execute();
      this.actionHistory.push(actionToRedo);
    }
  }


  public addChainStitch() {
    const shift = this.calculateShift();
    const newNodeAction = new AddNodeAction(this.graph, {
      ...CHAIN_NODE,
      x: this.startStitchFocus.x + shift.x * 5,
      y: this.startStitchFocus.y + shift.y * 5,
    });
    newNodeAction.execute();
    const createdNode = newNodeAction.createdNode!;

    const addLinkAction = new AddLinkAction(this.graph, { ...CHAIN_LINK }, this.startStitchFocus, createdNode);
    addLinkAction.execute()

    this.setStartStitch(createdNode);

    this.recordAction(new CompositeAction().addAction(newNodeAction).addAction(addLinkAction));
  }

  public addDirectLinkStitch() {
    if (this.startStitchFocus === this.targetStitchFocus || this.startStitchFocus.links.some(l => l.source === this.targetStitchFocus || l.target === this.targetStitchFocus)) return;

    const addLinkAction = new AddLinkAction(this.graph, { ...DIRECT_LINK }, this.startStitchFocus, this.targetStitchFocus);
    addLinkAction.execute();

    this.setStartStitch(this.targetStitchFocus);

    this.recordAction(new CompositeAction().addAction(addLinkAction));
  }

  public addCrochetStitch() {
    if (this.startStitchFocus === this.targetStitchFocus) return;

    const shift = this.calculateShift();
    const newNodeAction = new AddNodeAction(this.graph, {
      ...CROCHET_NODE,
      x: this.startStitchFocus.x + shift.x * 5,
      y: this.startStitchFocus.y + shift.y * 5,
    });
    newNodeAction.execute();
    const createdNode = newNodeAction.createdNode!;

    const addLinkStemAction = new AddLinkAction(this.graph, { ...CROCHET_LINK_STEM }, createdNode, this.targetStitchFocus);
    addLinkStemAction.execute()
    const addLinkSideAction = new AddLinkAction(this.graph, { ...CROCHET_LINK_SIDE }, this.startStitchFocus, createdNode);
    addLinkSideAction.execute()

    this.setStartStitch(createdNode);

    this.recordAction(new CompositeAction().addAction(newNodeAction).addAction(addLinkStemAction).addAction(addLinkSideAction));
  }
}

function configureRendering(controller: SchemaController, renderer: GraphControllerCanvas2D) {
  const fg = renderer.foregroundRender;
  fg.nodeStyle.set(node => (node as GraphNode & NodeData).style)
  fg.linkStyle.set(node => (node as GraphLink & LinkData).style)

  const renderSelectedNodes = () => {
    const ctx = fg.canvasContext.value;
    const getStyle = fg.nodeStyle.value;

    ctx.save();

    for(const [node, color, relSize] of [
      [controller.startStitchFocus, "green", 1.2],
      [controller.targetStitchFocus, "red", 1.4],
    ] as [GraphNode, string, number][]) {
      const style = getStyle(node);

      if (style.visible) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, style.relSize * relSize, 0, 2 * Math.PI, false);
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
    if (!ref.current || controllerRef.current) return; // Prevent re-instantiation

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
  }, [inputData, getSize]);

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
        const target = controller.graph.getClosestByDirection(currentNode, dirX, dirY);

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

      if (ev.key === "x") {
        controller.addDirectLinkStitch()
      }

      if (ev.key === "v") {
        controller.addCrochetStitch()
      }
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
