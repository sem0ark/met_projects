import { type GraphData, type GraphLink, type GraphNode } from "./d3-bindings";
import { LinkedObservable, Observable } from "./observable";

const noop = () => {}

export type NodeStyle = {
  visible: boolean;
  relSize: number; // Ratio of node circle area (square px) per value unit.
  color: string; // Attribute for node color (affects circle color).
  
  // Optional override function to totally replace the rendering logic
  drawNodeFn?: (ctx: CanvasRenderingContext2D, node: GraphNode, style: NodeStyle, globalScale: number, isShadow: boolean) => void;
}
export const defaultNodeStyle: Readonly<NodeStyle> = {
  visible: true,
  relSize: 5,
  color: "rgba(31, 120, 180)",
}
export type LinkStyle = {
  visible: boolean;
  color: string;
  lineDash: number[]; // Add line dashes.
  width: number;
  curvature: number;

  // directionalArrowLength: number;
  // directionalArrowColor: string;
  // directionalArrowRelPos: number; // value between 0<>1 indicating the relative pos along the (exposed) line

  // Optional override function to totally replace the rendering logic
  drawLinkFn?: (ctx: CanvasRenderingContext2D, link: GraphLink, style: LinkStyle, globalScale: number, isShadow: boolean) => void;
}

export const defaultLinkStyle: LinkStyle = {
  visible: true,
  color: "rgba(0,0,0,0.15)",
  lineDash: [],
  width: 1,
  curvature: 0,

  // directionalArrowLength: 0,
  // directionalArrowColor: "rgba(0,0,0,0.15)",
  // directionalArrowRelPos: 0.5,
}


const getControlPoints = (link: GraphLink, curvature: number): number[] => {
  if (!curvature || curvature === 0) return [];

  const start = link.source;
  const end = link.target;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const l = dx * dx + dy * dy;

  if (l > 0) {
    const a = Math.atan2(end.y - start.y, end.x - start.x); // line angle
    const d = l * curvature; // control point distance
    return [
      (start.x + end.x) / 2 + d * Math.cos(a - Math.PI / 2),
      (start.y + end.y) / 2 + d * Math.sin(a - Math.PI / 2),
    ];
  } else {
    // Same point, draw a loop
    const d = curvature * 70;
    return [end.x, end.y - d, end.x + d, end.y];
  }
}


export class Canvas2DGraphRender {
  private readonly NODE_PADDING_SHADOW = 1;
  // padding for wider line Link (2) + interaction precision (4)
  private readonly LINK_PADDING_SHADOW = 2 + 4; 

  public readonly onNeedsRedraw: Observable<() => void, this>;
  public readonly nodeStyle: Observable<((node: GraphNode) => NodeStyle), this>;
  public readonly linkStyle: Observable<((node: GraphLink) => LinkStyle), this>;
  public readonly tickSteps: Observable<(() => void)[], this>;
  public readonly globalScale: Observable<number, this>;

  isShadowCanvas: boolean;
  canvasContext: Observable<CanvasRenderingContext2D, this>;
  graph: Observable<GraphData, this>

  constructor(canvasContext: CanvasRenderingContext2D, graphDataObs: Observable<GraphData, unknown>, isShadowCanvas = false) {
    this.isShadowCanvas = isShadowCanvas;
    this.onNeedsRedraw = new Observable(this, noop, []);
    const requestRedraw = () => this.onNeedsRedraw.value()

    this.graph = new LinkedObservable(this, graphDataObs, [requestRedraw]);

    this.nodeStyle = new Observable(this, (() => defaultNodeStyle) as ((node: GraphNode) => NodeStyle), [requestRedraw]);
    this.linkStyle = new Observable(this, (() => defaultLinkStyle) as ((node: GraphLink) => LinkStyle), [requestRedraw]);

    this.tickSteps = new Observable(this, [
      () => this.renderLinks(),
      () => this.renderNodes(),
    ], [requestRedraw]);

    this.globalScale = new Observable(this, 1, []);
    this.canvasContext = new Observable(this, canvasContext, []);
  }

  public tick() {
    this.tickSteps.value.forEach(step => step())
  }

  private renderNodes() {
    const ctx = this.canvasContext.value;
    const globalScale = this.globalScale.value;
    // Select padding dynamically based on whether it's a shadow canvas or main canvas
    const paddingAmount = this.isShadowCanvas ? this.NODE_PADDING_SHADOW : 0;
    const padding = paddingAmount / globalScale;

    const getStyle = this.nodeStyle.value;

    ctx.save();
    for (const node of this.graph.value.nodes) {
      const style = getStyle(node);
      if (!style.visible) continue;

      // Check if a custom draw function is provided in the style
      if (style.drawNodeFn) {
        // Call the custom function if provided
        style.drawNodeFn(ctx, node, style, globalScale, this.isShadowCanvas);
      } else {
        // Use the default internal drawing function
        this.defaultPaintNode(ctx, node, style, padding);
      }
    }
    ctx.restore();
  }
  
  private defaultPaintNode(ctx: CanvasRenderingContext2D, node: GraphNode, style: NodeStyle, padding: number) {
    const r = style.relSize + padding;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = style.color;
    ctx.fill();
  }

  private renderLinks() {
    const ctx = this.canvasContext.value;
    const globalScale = this.globalScale.value;
    // Select padding dynamically
    const paddingAmount = this.isShadowCanvas ? this.LINK_PADDING_SHADOW : 0;
    const padding = paddingAmount / globalScale;

    const getStyle = this.linkStyle.value;

    const isIncorrect = (link: GraphLink) => {
      const start = link.source;
      const end = link.target;
      return !start || !end || start.x === undefined || end.x === undefined;
    }

    const linksToDraw = this.graph.value.links.filter(link => !isIncorrect(link) && getStyle(link).visible);

    ctx.save();
    ctx.lineCap = "round";

    // In this refactored approach, we iterate through links, handling default vs custom drawing per link
    for (const link of linksToDraw) {
        const style = getStyle(link);

        // Check if a custom draw function is provided in the style
        if (style.drawLinkFn) {
            style.drawLinkFn(ctx, link, style, globalScale, this.isShadowCanvas);
        } else {
            // Use the default internal drawing function
            this.defaultPaintLink(ctx, link, style, padding, globalScale);
        }
    }
    ctx.restore();
  }

  // Extracted default link painting logic (simplified grouping is removed for clarity/dynamic style iteration)
  private defaultPaintLink(ctx: CanvasRenderingContext2D, link: GraphLink, style: LinkStyle, padding: number, globalScale: number) {
    const start = link.source;
    const end = link.target;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);

    const cps = getControlPoints(link, style.curvature);
    if (cps.length === 0) {
        ctx.lineTo(end.x, end.y);
    } else if (cps.length === 2) {
        ctx.quadraticCurveTo(cps[0], cps[1], end.x, end.y);
    } else {
        ctx.bezierCurveTo(cps[0], cps[1], cps[2], cps[3], end.x, end.y);
    }

    ctx.strokeStyle = style.color;
    ctx.lineWidth = (style.width || 1) / globalScale + padding;
    ctx.setLineDash(style.lineDash);
    ctx.stroke();
  }
}
