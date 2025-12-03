import { select as d3Select } from "d3-selection";
import { zoom as d3Zoom, zoomTransform as d3ZoomTransform } from "d3-zoom";
import { drag as d3Drag } from "d3-drag";
import { max as d3Max, min as d3Min, sum as d3Sum } from "d3-array";

import { toFlat } from "./index-array-by";
import { D3Bindings, type GraphData, type GraphLink, type GraphNode } from "./force-graph-d3-bindings";
import ColorTracker from "./canvas-color-tracker";
import { LinkedObservable, Observable } from "./utils/observable";
import { throttle } from "./utils/throttle";

import "./force-graph.css";

const noop = () => {}

const HOVER_CANVAS_THROTTLE_DELAY = 800; // ms to throttle shadow canvas updates for perf improvement
const ZOOM2NODES_FACTOR = 4;
const DRAG_CLICK_TOLERANCE_PX = 5; // How many px can a node be accidentally dragged before disabling the click


export type NodeStyle = {
  visible: boolean;
  relSize: number; // Ratio of node circle area (square px) per value unit.
  color: string; // Attribute for node color (affects circle color).
  
  // Optional override function to totally replace the rendering logic
  drawNodeFn?: (ctx: CanvasRenderingContext2D, node: GraphNode, style: NodeStyle, globalScale: number, isShadow: boolean) => void;
}
const defaultNodeStyle: Readonly<NodeStyle> = {
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

const defaultLinkStyle: LinkStyle = {
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
  graphData: Observable<GraphData, this>

  constructor(canvasContext: CanvasRenderingContext2D, graphDataObs: Observable<GraphData, unknown>, isShadowCanvas = false) {
    this.isShadowCanvas = isShadowCanvas;
    this.onNeedsRedraw = new Observable(this, noop, []);
    const requestRedraw = () => this.onNeedsRedraw.value()

    this.graphData = new LinkedObservable(this, graphDataObs, [requestRedraw]);

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
    for (const node of this.graphData.value.nodes) {
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
    // Draw logic extracted from the original paintNodes function
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

    const linksToDraw = this.graphData.value.links.filter(link => !isIncorrect(link) && getStyle(link).visible);

    ctx.save();
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


export class GraphControllerCanvas2D {
  private is_initialized: boolean;
  private container: HTMLDivElement;

  private canvas: HTMLCanvasElement;
  private shadowCanvas: HTMLCanvasElement;
  private canvasContext: CanvasRenderingContext2D;
  private shadowCanvasContext: CanvasRenderingContext2D;

  private animationFrameRequestId: number | null;
  private needsRedraw: boolean;
  private animationCycle = noop;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private zoom: any;
  private lastSetZoom: number;

  private pointerPos: { x: number; y: number; };
  private isPointerDragging: boolean;
  private isPointerPressed: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private hoverObject: any;

  public readonly graphData: Observable<GraphData, this>;

  public readonly simulation: D3Bindings;
  public readonly forceGraph: Canvas2DGraphRender;
  public readonly shadowGraph: Canvas2DGraphRender;
  private colorTracker: ColorTracker<{
    type: string;
    entity: GraphNode | GraphLink
  }>;

  public readonly dimensions: Observable<{width: number, height: number}, this>;
  public readonly backgroundColor: Observable<string, this>;
  public readonly autoPauseRedraw: Observable<boolean, this>

  public readonly mouseControlsEnabled: Observable<boolean, this>;
  public readonly nodeDragEnabled: Observable<boolean, this>;
  public readonly zoomInteractionEnabled: Observable<boolean, this>;
  public readonly panInteractionEnabled: Observable<boolean, this>;

  constructor(root: HTMLElement, dimensions: {width: number, height: number}) {
    this.is_initialized = false;
    this.needsRedraw = false

    // Wipe root DOM element's contents
    root.innerHTML = "";

    this.animationFrameRequestId = null as number | null;
    this.lastSetZoom = 1;
    this.zoom = d3Zoom();

    this.mouseControlsEnabled = new Observable(this, true, [
      () => {
        this.hoverObject = null;
      }
    ]);

    this.nodeDragEnabled = new Observable(this, true, []);
    this.zoomInteractionEnabled = new Observable(this, true, []);
    this.panInteractionEnabled = new Observable(this, true, []);

    this.pointerPos = { x: -1e12, y: -1e12 };
    this.isPointerDragging = false;
    this.isPointerPressed = false;

    // Container anchor for canvas and tooltip
    this.container = document.createElement("div");
    this.container.classList.add("force-graph-container");
    this.container.style.position = "relative";
    root.appendChild(this.container);

    this.shadowCanvas = document.createElement("canvas");
    this.canvas = document.createElement("canvas");
    this.canvas.style.background = "white";

    // this.shadowCanvas.style.position = 'absolute';
    // this.shadowCanvas.style.top = '0';
    // this.shadowCanvas.style.left = '0';
    // this.shadowCanvas.style.pointerEvents = 'none';
    // this.container.appendChild(this.shadowCanvas);
    this.container.appendChild(this.canvas);

    this.canvasContext = this.canvas.getContext("2d")!;
    this.shadowCanvasContext = this.shadowCanvas.getContext("2d", {
      willReadFrequently: true,
    })!;

    const pxScale = window.devicePixelRatio; // 2 on retina displays
    this.canvasContext.scale(pxScale, pxScale);
    this.shadowCanvasContext.scale(pxScale, pxScale);

    this.dimensions = new Observable(this, dimensions, [
      () => {
        this.adjustCanvasSize()
      }
    ]);

    this.backgroundColor = new Observable(this, "white", [
      (value) => {
        this.canvas.style.background = value;
      }
    ]);

    this.simulation = new D3Bindings();

    this.forceGraph = new Canvas2DGraphRender(
      this.canvasContext,
      this.simulation.graphData,
    ).onNeedsRedraw.set(() => (this.needsRedraw = true));

    this.colorTracker = new ColorTracker();
    this.shadowGraph = new Canvas2DGraphRender(
      this.shadowCanvasContext,
      this.simulation.graphData,
      true,
    )
      .onNeedsRedraw.set(() => (this.needsRedraw = true))
      .nodeStyle.set((v: GraphNode) => ({ ...defaultNodeStyle, color: v.data?.__indexColor ?? defaultNodeStyle.color}))
      .linkStyle.set((v: GraphLink) => ({ ...defaultLinkStyle, color: v.data?.__indexColor ?? defaultLinkStyle.color}));

    this.autoPauseRedraw = new Observable(this, true, []);
    this.graphData = new LinkedObservable(this, this.simulation.graphData, [
      (graphData) => {
        if ([graphData.nodes, graphData.links].every((arr) => (arr || []).every((element) => !element.data?.__indexColor))) {
          this.colorTracker.reset();
        }

        [
          { type: "Node", objs: graphData.nodes },
          { type: "Link", objs: graphData.links },
        ].forEach(({ type, objs }) => {
          objs
            .filter((element) => {
              if (!element.data?.__indexColor) return true;

              const cur = this.colorTracker.lookup(element.data?.__indexColor);
              return !cur || !cur.entity || cur.entity !== element;
            })
            .forEach((element) => {
              element.data ??= {};
              element.data.__indexColor = this.colorTracker.register({ type, entity: element });
            })
        })
      }
    ])
  }

  updateSimulation(cb: (root: D3Bindings) => unknown) {
    cb(this.simulation);
    return this;
  }
  updateForegroundRender(cb: (root: Canvas2DGraphRender) => unknown) {
    cb(this.forceGraph);
    return this;
  }
  updateMouseTrackingRender(cb: (root: Canvas2DGraphRender) => unknown) {
    cb(this.shadowGraph);
    return this;
  }

  getObjUnderPointer() {
    const pxScale = window.devicePixelRatio;
    const px =
      this.pointerPos.x > 0 && this.pointerPos.y > 0
        ? this.shadowCanvasContext.getImageData(this.pointerPos.x * pxScale, this.pointerPos.y * pxScale, 1, 1)
        : null;

    // Lookup object per pixel color
    if (px) {
      return this.colorTracker.lookup(px.data);
    }
    return null;
  };

  init() {
    // Setup node drag interaction
    d3Select(this.canvas).call(
      d3Drag<HTMLCanvasElement, unknown>()
        .subject(() => {
          if (!this.nodeDragEnabled.value) {
            return null;
          }
          const obj = this.getObjUnderPointer();
          return obj && obj.type === "Node" ? obj.entity : null; // Only drag nodes
        })
        .on("start", (ev) => {
          const obj = ev.subject;
          obj.__initialDragPos = {
            x: obj.x,
            y: obj.y,
            fx: obj.fx,
            fy: obj.fy,
          };

          // keep engine running at low intensity throughout drag
          if (!ev.active) {
            obj.fx = obj.x;
            obj.fy = obj.y; // Fix points
          }

          // drag cursor
          this.canvas.classList.add("grabbable");
        })
        .on("drag", (ev) => {
          const obj = ev.subject;
          const initPos = obj.__initialDragPos;
          const dragPos = ev;

          const k = d3ZoomTransform(this.canvas).k;
          // const translate = {
          //   x: initPos.x + (dragPos.x - initPos.x) / k - obj.x,
          //   y: initPos.y + (dragPos.y - initPos.y) / k - obj.y,
          // };

          // Move fx/fy (and x/y) of nodes based on the scaled drag distance since the drag start
          obj.fx = obj.x = initPos.x + (dragPos.x - initPos.x) / k;
          obj.fy = obj.y = initPos.y + (dragPos.y - initPos.y) / k;

          // Only engage full drag if distance reaches above threshold
          if (
            !obj.__dragged &&
            DRAG_CLICK_TOLERANCE_PX >=
              Math.sqrt(d3Sum(["x", "y"].map((k) => (ev[k] - initPos[k]) ** 2)))
          )
            return;

          this.simulation
            .d3AlphaTarget.set(0.3) // keep engine running at low intensity throughout drag
            .resetCountdown(); // prevent freeze while dragging

          this.isPointerDragging = true;

          obj.__dragged = true;
          // this.onNodeDrag(obj, translate);
        })
        .on("end", (ev) => {
          const obj = ev.subject;
          const initPos = obj.__initialDragPos;
          // const translate = { x: obj.x - initPos.x, y: obj.y - initPos.y };

          if (initPos.fx === undefined) {
            obj.fx = undefined;
          }
          if (initPos.fy === undefined) {
            obj.fy = undefined;
          }
          delete obj.__initialDragPos;

          if (this.simulation.d3AlphaTarget.value) {
            this.simulation
              .d3AlphaTarget.set(0) // release engine low intensity
              .resetCountdown(); // let the engine readjust after releasing fixed nodes
          }

          // drag cursor
          this.canvas.classList.remove("grabbable");

          this.isPointerDragging = false;

          if (obj.__dragged) {
            delete obj.__dragged;
            // this.onNodeDragEnd.value(obj, translate);
          }
        })
    );

    // Setup zoom / pan interaction
    const canvasSelection = d3Select<HTMLCanvasElement, unknown>(this.canvas);
    this.zoom(canvasSelection); // Attach controlling elem for easy access
    this.zoom.__baseElem = canvasSelection;
    this.zoom.__baseElem.on("dblclick.zoom", null); // Disable double-click to zoom

    this.zoom
      .filter(
        (ev: MouseEvent) =>
          // disable zoom interaction
          !ev.button &&
          (ev.type !== "wheel" || this.zoomInteractionEnabled.value) &&
          (ev.type === "wheel" || this.panInteractionEnabled.value),
      )
      .on("zoom", (ev) => {
        const t = ev.transform;
        [this.canvasContext, this.shadowCanvasContext].forEach((c) => {
          resetTransform(c);
          c.translate(t.x, t.y);
          c.scale(t.k, t.k);
        });
        this.isPointerDragging = true;
        // this?.onZoom?.({ ...t, ...this.centerAt() }); // report x,y coordinates relative to canvas center
        this.needsRedraw = true;
      })
      .on("end", () => {
        this.isPointerDragging = false;
        // this?.onZoomEnd?.({ ...ev.transform, ...this.centerAt() });
      });

    this.adjustCanvasSize();

    this.simulation
      .onFinishUpdate.set(() => {
        // re-zoom, if still in default position (not user modified)
        if (
          d3ZoomTransform(this.canvas).k === this.lastSetZoom &&
          this.simulation.graphData.value.nodes.length
        ) {
          this.zoom.scaleTo(
            this.zoom.__baseElem,
            (this.lastSetZoom =
              ZOOM2NODES_FACTOR / Math.cbrt(this.simulation.graphData.value.nodes.length)),
          );
          this.needsRedraw = true;
        }
      });

    // let pointerDownEvent: Event | null = null;
    // Capture pointer coords on move or touchstart
    ["pointermove", "pointerdown"].forEach((evType) =>
      this.container.addEventListener(
        evType,
        (ev: any) => {
          if (evType === "pointerdown") {
            this.isPointerPressed = true; // track click state
            // pointerDownEvent = ev;
          }

          // detect pointer drag on canvas pan
          // if (
          //   !this.isPointerDragging &&
          //   ev.type === "pointermove" &&
          //   this.onBackgroundClick && // only bother detecting drags this way if background clicks are enabled (so they don't trigger accidentally on canvas panning)
          //   (ev.pressure > 0 || this.isPointerPressed) && // ev.pressure always 0 on Safari, so we use the isPointerPressed tracker
          //   (ev.pointerType === "mouse" || ev.movementX === undefined || [ev.movementX, ev.movementY].some((m) => Math.abs(m) > 1)) // relax drag trigger sensitivity on non-mouse (touch/pen) events
          // ) {
          //   this.isPointerDragging = true;
          // }

          // update the pointer pos
          const offset = getOffset(this.container);
          this.pointerPos.x = ev.pageX - offset.left;
          this.pointerPos.y = ev.pageY - offset.top;
        },
        { passive: true },
      ),
    );

    // Handle click/touch events on nodes/links
    this.container.addEventListener(
      "pointerup",
      () => {
        if (!this.isPointerPressed) {
          return; // don't trigger click events if pointer is not pressed on the canvas
        }

        this.isPointerPressed = false;
        if (this.isPointerDragging) {
          this.isPointerDragging = false;
          return; // don't trigger click events after pointer drag (pan / node drag functionality)
        }

        // const cbEvents = [ev, pointerDownEvent];
        // requestAnimationFrame(() => {
        //   // trigger click events asynchronously, to allow hoverObject to be set (on frame)
        //   if (ev.button === 0) {
        //     // mouse left-click or touch
        //     if (this.hoverObject) {
        //       state[`on${this.hoverObject.type}Click`]?.(
        //         this.hoverObject.d,
        //         ...cbEvents,
        //       );
        //     } else {
        //       state?.onBackgroundClick?.(...cbEvents);
        //     }
        //   }

        //   if (ev.button === 2) {
        //     // mouse right-click
        //     if (this.hoverObject) {
        //       state[`on${this.hoverObject.type}RightClick`]?.(
        //         this.hoverObject.d,
        //         ...cbEvents,
        //       );
        //     } else {
        //       state?.onBackgroundRightClick?.(...cbEvents);
        //     }
        //   }
        // });
      },
      { passive: true },
    );

    // this.container.addEventListener("contextmenu", (ev) => {
    //   if (
    //     !this.onBackgroundRightClick &&
    //     !this.onNodeRightClick &&
    //     !this.onLinkRightClick
    //   )
    //     return true; // default contextmenu behavior
    //   ev.preventDefault();
    //   return false;
    // });

    this.is_initialized = true;
  }

  startRenderCycle() {
    const refreshShadowCanvas = throttle(() => {
      // wipe canvas
      clearCanvas(this.shadowCanvasContext, this.dimensions.value.width, this.dimensions.value.height);

      // redraw
      const t = d3ZoomTransform(this.canvas);
      this.shadowGraph.globalScale.set(t.k).tick();
    }, HOVER_CANVAS_THROTTLE_DELAY);

    const animationCycle = () => {
      // IIFE
      const doRedraw = !this.autoPauseRedraw.value || !!this.needsRedraw || this.simulation.isEngineRunning();
      this.needsRedraw = false;

      if (this.mouseControlsEnabled.value) {
        // Update tooltip and trigger onHover events
        const obj = !this.isPointerDragging ? this.getObjUnderPointer() : null; // don't hover during drag
        if (obj !== this.hoverObject) {
          // const prevObj = this.hoverObject;
          // const prevObjType = prevObj ? prevObj.type : null;
          // const objType = obj ? obj.type : null;

          // if (prevObjType && prevObjType !== objType) {
          //   // Hover out
          //   state[`on${prevObjType}Hover`]?.(null, prevObj.d);
          // }
          // if (objType) {
          //   // Hover in
          //   state[`on${objType}Hover`]?.(
          //     obj.d,
          //     prevObjType === objType ? prevObj.d : null,
          //   );
          // }

          // this.tooltip.content(
          //   obj
          //     ? accessorFn(state[`${obj.type.toLowerCase()}Label`])(obj.d) ||
          //         null
          //     : null,
          // );

          // set pointer if hovered object is clickable
          // this.canvas.classList[
          //   ((obj && state[`on${objType}Click`]) ||
          //     (!obj && this.onBackgroundClick)) &&
          //   accessorFn(this.showPointerCursor)(obj?.d)
          //     ? "add"
          //     : "remove"
          // ]("clickable");

          this.hoverObject = obj;
        }

        if (doRedraw) refreshShadowCanvas();
      }

      if (doRedraw) {
        // Wipe canvas
        clearCanvas(this.canvasContext, this.dimensions.value.width, this.dimensions.value.height);

        // Frame cycle
        const globalScale = d3ZoomTransform(this.canvas).k;
        // state?.onRenderFramePre?.(ctx, globalScale);
        this.simulation.tick();
        this.forceGraph.globalScale.set(globalScale).tick();
        // state?.onRenderFramePost?.(ctx, globalScale);
      }

      this.animationFrameRequestId = requestAnimationFrame(animationCycle);
    }

    this.animationCycle = animationCycle;
    animationCycle();
  }

  destructor() {
    this.pauseAnimation();
    this.simulation.destructor();
  }

  adjustCanvasSize() {
    if (!this.is_initialized || !this.canvas) {
      return;
    }

    let curWidth = this.canvas.width;
    let curHeight = this.canvas.height;
    if (curWidth === 300 && curHeight === 150) {
      // Default canvas dimensions
      curWidth = curHeight = 0;
    }

    const pxScale = window.devicePixelRatio; // 2 on retina displays
    curWidth /= pxScale;
    curHeight /= pxScale;

    // Resize canvases
    [this.canvas, this.shadowCanvas].forEach((canvas) => {
      // Element size
      canvas.style.width = `${this.dimensions.value.width}px`;
      canvas.style.height = `${this.dimensions.value.height}px`;

      // Memory size (scaled to avoid blurriness)
      canvas.width = this.dimensions.value.width * pxScale;
      canvas.height = this.dimensions.value.height * pxScale;
    });

    // Relative center panning based on 0,0
    const k = d3ZoomTransform(this.canvas).k;
    this.zoom.translateBy(
      this.zoom.__baseElem,
      (this.dimensions.value.width - curWidth) / 2 / k,
      (this.dimensions.value.height - curHeight) / 2 / k,
    );

    this.needsRedraw = true;
  }

  graph2ScreenCoords(x: number, y: number) {
    const t = d3ZoomTransform(this.canvas);
    return { x: x * t.k + t.x, y: y * t.k + t.y };
  }

  screen2GraphCoords(x: number, y: number) {
    const t = d3ZoomTransform(this.canvas);
    return { x: (x - t.x) / t.k, y: (y - t.y) / t.k };
  }

  centerAt(x: number, y: number) {
    if (!this.canvas) return null; // no canvas yet
    const t = d3ZoomTransform(this.canvas);
    const centerX = (this.dimensions.value.width / 2 - t.x) / t.k;
    const centerY = (this.dimensions.value.height / 2 - t.y) / t.k;

    // setter
    if (x !== undefined || y !== undefined) {
      this.zoom.translateTo(
        this.zoom.__baseElem,
        x === undefined ? centerX : x,
        y === undefined ? centerY : y,
      );
      this.needsRedraw = true;
    }

    // getter
    return {
      x: centerX,
      y: centerY,
    };
  }

  canvasZoom(k: number) {
    if (!this.canvas) return null; // no canvas yet

    // setter
    if (k !== undefined) {
      this.zoom.scaleTo(this.zoom.__baseElem, k);
      this.needsRedraw = true;
      return this;
    }

    // getter
    return d3ZoomTransform(this.canvas).k;
  }

  zoomToFit(padding = 10, bboxArgs: null | {x: [number, number], y: [number, number]} = null) {
    const bbox = !bboxArgs ? this.getGraphBbox() : bboxArgs;

    if (bbox) {
      const center = {
        x: (bbox.x[0] + bbox.x[1]) / 2,
        y: (bbox.y[0] + bbox.y[1]) / 2,
      };

      const zoomK = Math.max(
        1e-12,
        Math.min(
          1e12,
          (this.dimensions.value.width - padding * 2) / (bbox.x[1] - bbox.x[0]),
          (this.dimensions.value.height - padding * 2) / (bbox.y[1] - bbox.y[0]),
        ),
      );

      this.centerAt(center.x, center.y);
      this.zoom(zoomK);
    }

    return this;
  }

  getGraphBbox(nodeFilter = () => true) {
    const styleGetter = this.forceGraph.nodeStyle.value;
    const getStyle = typeof styleGetter === "function" ? styleGetter : () => styleGetter;

    const nodesPos = this.simulation.graphData.value.nodes.filter(nodeFilter).map((node) => ({
      x: node.x,
      y: node.y,
      r: getStyle(node).relSize,
    }));

    if (!nodesPos.length) throw new Error("Graph is empty!");

    return {
      x: [
        d3Min(nodesPos, (node) => node.x - node.r) as number,
        d3Max(nodesPos, (node) => node.x + node.r) as number,
      ],
      y: [
        d3Min(nodesPos, (node) => node.y - node.r) as number,
        d3Max(nodesPos, (node) => node.y + node.r) as number,
      ],
    };
  }

  pauseAnimation() {
    if (this.animationFrameRequestId) {
      cancelAnimationFrame(this.animationFrameRequestId);
      this.animationFrameRequestId = null;
    }
  }

  resumeAnimation() {
    if (!this.animationFrameRequestId) {
      this.animationCycle();
    }
  }
}

function resetTransform(ctx: CanvasRenderingContext2D) {
  const pxRatio = window.devicePixelRatio;
  ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
}

function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  resetTransform(ctx); // reset transform
  ctx.clearRect(0, 0, width, height);
  ctx.restore(); //restore transforms
}

function getOffset(el: HTMLElement) {
  const rect = el.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
}
