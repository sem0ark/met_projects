/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Force } from "d3-force";

import Kapsule, { asKapsuleConfig, type ExtractKapsuleStateType } from "./kapsule";
import { toFlat } from "./index-array-by";
import { d3ForceConfig, layoutTick, type GraphLink, type GraphNode } from "./force-graph-d3-bindings";

// import { autoColorObjects } from "./color-utils";

const noop = () => {}
// const constFn = <T>(value: T) => () => value
// const accessorFn = <T>(value: T) => () => value

// const notifyRedraw = noop;

const notifyRedraw = (_: unknown, state: {onNeedsRedraw: () => void}) => {
  state.onNeedsRedraw();
}

export type NodeStyle = {
  visible: boolean;
  relSize: number; // Ratio of node circle area (square px) per value unit.
  color: string; // Attribute for node color (affects circle color).
}
const defaultNodeStyle: Readonly<NodeStyle> = {
  visible: true,
  relSize: 5,
  color: "rgba(31, 120, 180, 0.92)",
}
export type LinkStyle = {
  visible: boolean;
  color: string;
  lineDash: number[]; // Add line dashes.
  width: number;
  curvature: number;

  directionalArrowLength: number;
  directionalArrowColor: string;
  directionalArrowRelPos: number; // value between 0<>1 indicating the relative pos along the (exposed) line
}
const defaultLinkStyle: LinkStyle = {
  visible: true,
  color: "rgba(0,0,0,0.15)",
  lineDash: [],
  width: 1,
  curvature: 0,

  directionalArrowLength: 0,
  directionalArrowColor: "rgba(0,0,0,0.15)",
  directionalArrowRelPos: 0.5,
}

export const forceGraphConfigCanvas2D = asKapsuleConfig({
  props: {
    ...d3ForceConfig.props,

    // nodeDataConfiguration: { default: 1, triggerUpdate: false, onChange: notifyRedraw },

    nodeStyle: { default: defaultNodeStyle as NodeStyle | ((node: GraphNode) => NodeStyle), triggerUpdate: false, onChange: notifyRedraw },
    // drawNode: { default: 1, triggerUpdate: false, onChange: notifyRedraw },

    linkStyle: { default: defaultLinkStyle as LinkStyle | ((link: GraphLink) => LinkStyle), triggerUpdate: false, onChange: notifyRedraw },
    // drawLink: { default: 1, triggerUpdate: false, onChange: notifyRedraw },

    tickSteps: {
      // list of callbacks receiving the current state to make an action on a tick
      default: [] as ((state: any /* StateType */) => void)[]
    },

    globalScale: { default: 1, triggerUpdate: false },
    onNeedsRedraw: { default: noop, triggerUpdate: false },
  },
    
  methods: {
    addD3Force: (state, forceName: string, forceFn?: Force<any, any>) => {
      if (forceFn === undefined) {
        return state.forceSimulation.force(forceName); // Force getter
      }
      state.forceSimulation.force(forceName, forceFn); // Force setter
    },
    d3ReheatSimulation(state) {
      
      state.forceSimulation.alpha(1);
      forceGraphConfigCanvas2D.methods.resetCountdown(state);
    },
    resetCountdown(state) { // reset cooldown state
      state.cntTicks = 0;
      state.startTickTimeMs = Number(new Date());
      state.engineRunning = true;
    },
    isEngineRunning: (state) => !!state.engineRunning,

    tickFrame(state) {
      state.tickSteps?.forEach(step => step(state))
    },
  },

  stateInit: ({ canvasContext }: {
    canvasContext: CanvasRenderingContext2D
  }) => ({
    ...d3ForceConfig.stateInit!({}),
    canvasContext: canvasContext,
  }),

  update(state, changedProps) {
    d3ForceConfig.update(state, changedProps);
  },
})

// Rendering logic
type ForceGraphCanvasState = ExtractKapsuleStateType<typeof forceGraphConfigCanvas2D>;

const paintNodes = (padAmount: number) => (state: ForceGraphCanvasState) => {
  const ctx = state.canvasContext;
  const padding = padAmount / state.globalScale;

  ctx.save();
  for(const node of state.graphData.nodes) {
    const style = typeof state.nodeStyle === "function" ? state.nodeStyle(node) : state.nodeStyle;
    if (!style.visible) continue;

    // Draw wider nodes by 1px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
    const r = style.relSize + padding;

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = style.color;
    ctx.fill();
  }
  ctx.restore();
}

const paintLinks = (padAmount: number) => (state: ForceGraphCanvasState) => {
  const padding = padAmount / state.globalScale;

  const getStyle = (typeof state.linkStyle === "function" ? state.linkStyle : () => state.linkStyle) as ((link: GraphLink) => LinkStyle);
  const isIncorrect = (link: GraphLink) => {
    const start = link.source;
    const end = link.target;
    return !start || !end || start.x === undefined || end.x === undefined;
  }

  const ctx = state.canvasContext;

  const linksToDraw = state.graphData.links.filter(link => !isIncorrect(link) && getStyle(link).visible);

  // Bundle strokes per unique color/width/dash for performance optimization
  const linksGrouped = toFlat(linksToDraw, [
    link => getStyle(link).color,
    link => getStyle(link).width,
    link => +!!getStyle(link).lineDash,
  ]);

  ctx.save();
  for (const { values: links } of linksGrouped) {
    const style = getStyle(links[0]);

    ctx.beginPath();

    for (const link of links) {
      const start = link.source;
      const end = link.target;
      ctx.moveTo(start.x, start.y);

      const cps = getControlPoints(link, style.curvature);
      if (!cps) {
        ctx.lineTo(end.x, end.y);
      } else if (cps.length === 2) {
        ctx.quadraticCurveTo(cps[0], cps[1], end.x, end.y);
      } else {
        ctx.bezierCurveTo(cps[0], cps[1], cps[2], cps[3], end.x, end.y);
      }
    }

    ctx.strokeStyle = style.color;
    ctx.lineWidth = (style.width || 1) / state.globalScale + padding;
    ctx.setLineDash(style.lineDash);
    ctx.stroke();
  }
  ctx.restore();
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


// const paintArrows = (state) => {
//   const ARROW_WH_RATIO = 1.6;
//   const ARROW_VLEN_RATIO = 0.2;

//   const getLength = accessorFn(state.linkDirectionalArrowLength);
//   const getRelPos = accessorFn(state.linkDirectionalArrowRelPos);
//   const getVisibility = accessorFn(state.linkVisibility);
//   const getColor = accessorFn(
//     state.linkDirectionalArrowColor || state.linkColor,
//   );
//   const getNodeVal = accessorFn(state.nodeVal);
//   const ctx = state.ctx;

//   ctx.save();
//   state.graphData.links.filter(getVisibility).forEach((link) => {
//     const arrowLength = getLength(link);
//     if (!arrowLength || arrowLength < 0) return;

//     const start = link.source;
//     const end = link.target;

//     if (
//       !start ||
//       !end ||
//       !start.hasOwnProperty("x") ||
//       !end.hasOwnProperty("x")
//     )
//       return; // skip invalid link

//     const startR =
//       Math.sqrt(Math.max(0, getNodeVal(start) || 1)) * state.nodeRelSize;
//     const endR =
//       Math.sqrt(Math.max(0, getNodeVal(end) || 1)) * state.nodeRelSize;

//     const arrowRelPos = Math.min(1, Math.max(0, getRelPos(link)));
//     const arrowColor = getColor(link) || "rgba(0,0,0,0.28)";
//     const arrowHalfWidth = arrowLength / ARROW_WH_RATIO / 2;

//     // Construct bezier for curved lines
//     const bzLine =
//       link.__controlPoints &&
//       new Bezier(start.x, start.y, ...link.__controlPoints, end.x, end.y);

//     const getCoordsAlongLine = bzLine
//       ? (t) => bzLine.get(t) // get position along bezier line
//       : (t) => ({
//           // straight line: interpolate linearly
//           x: start.x + (end.x - start.x) * t || 0,
//           y: start.y + (end.y - start.y) * t || 0,
//         });

//     const lineLen = bzLine
//       ? bzLine.length()
//       : Math.sqrt(
//           Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
//         );

//     const posAlongLine =
//       startR +
//       arrowLength +
//       (lineLen - startR - endR - arrowLength) * arrowRelPos;

//     const arrowHead = getCoordsAlongLine(posAlongLine / lineLen);
//     const arrowTail = getCoordsAlongLine(
//       (posAlongLine - arrowLength) / lineLen,
//     );
//     const arrowTailVertex = getCoordsAlongLine(
//       (posAlongLine - arrowLength * (1 - ARROW_VLEN_RATIO)) / lineLen,
//     );

//     const arrowTailAngle =
//       Math.atan2(arrowHead.y - arrowTail.y, arrowHead.x - arrowTail.x) -
//       Math.PI / 2;

//     ctx.beginPath();

//     ctx.moveTo(arrowHead.x, arrowHead.y);
//     ctx.lineTo(
//       arrowTail.x + arrowHalfWidth * Math.cos(arrowTailAngle),
//       arrowTail.y + arrowHalfWidth * Math.sin(arrowTailAngle),
//     );
//     ctx.lineTo(arrowTailVertex.x, arrowTailVertex.y);
//     ctx.lineTo(
//       arrowTail.x - arrowHalfWidth * Math.cos(arrowTailAngle),
//       arrowTail.y - arrowHalfWidth * Math.sin(arrowTailAngle),
//     );

//     ctx.fillStyle = arrowColor;
//     ctx.fill();
//   });
//   ctx.restore();
// }

export const ShadowGraph2DCanvas = (canvas: CanvasRenderingContext2D) => Kapsule(forceGraphConfigCanvas2D)({ canvasContext: canvas }).tickSteps([
    // Draw wider lines by 2px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
    paintLinks(2),
    // Draw wider nodes by 1px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
    paintNodes(1)
  ])

export const ForceGraph2DCanvas = (canvas: CanvasRenderingContext2D) => Kapsule(forceGraphConfigCanvas2D)({ canvasContext: canvas }).tickSteps([
  layoutTick,
  paintLinks(0),
  // paintArrows,
  paintNodes(0),
])
