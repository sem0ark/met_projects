import { select as d3Select } from "d3-selection";
import { zoom as d3Zoom, zoomTransform as d3ZoomTransform } from "d3-zoom";
import { drag as d3Drag } from "d3-drag";
import { max as d3Max, min as d3Min, sum as d3Sum } from "d3-array";

import { D3Bindings, type GraphData, type GraphLink, type GraphNode } from "./d3-bindings";
import { ColorTracker } from "./color-tracker";
import { LinkedObservable, Observable } from "./observable";
import { throttle } from "./utils/throttle";

import { defaultLinkStyle, defaultNodeStyle, Canvas2DGraphRender } from "./canvas-render";

import "./force-graph.css";

const noop = () => {}

const HOVER_CANVAS_THROTTLE_DELAY = 800; // ms to throttle shadow canvas updates for perf improvement
const ZOOM2NODES_FACTOR = 4;
const DRAG_CLICK_TOLERANCE_PX = 5; // How many px can a node be accidentally dragged before disabling the click

export class GraphControllerCanvas2D {
  private isInitialized: boolean;
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

  public readonly graph: Observable<GraphData, this>;

  public readonly simulation: D3Bindings;
  public readonly foregroundRender: Canvas2DGraphRender;
  public readonly mouseInteractionRender: Canvas2DGraphRender;
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

  constructor(graphSimulation: D3Bindings, root: HTMLElement, dimensions: {width: number, height: number}) {
    this.isInitialized = false;
    this.needsRedraw = false

    // Wipe root DOM element's contents
    root.innerHTML = "";

    this.animationFrameRequestId = null as number | null;
    this.lastSetZoom = 1;
    this.zoom = d3Zoom();

    this.mouseControlsEnabled = new Observable(this, true, [
      () => (this.hoverObject = null),
    ]);

    this.nodeDragEnabled = new Observable(this, true, []);
    this.zoomInteractionEnabled = new Observable(this, true, []);
    this.panInteractionEnabled = new Observable(this, true, []);

    this.pointerPos = { x: -1e12, y: -1e12 };
    this.isPointerDragging = false;
    this.isPointerPressed = false;

    // Container anchor for canvas
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

    this.simulation = graphSimulation;

    this.foregroundRender = new Canvas2DGraphRender(
      this.canvasContext,
      this.simulation.graph,
    ).onNeedsRedraw.set(() => (this.needsRedraw = true));

    this.colorTracker = new ColorTracker();
    this.mouseInteractionRender = new Canvas2DGraphRender(
      this.shadowCanvasContext,
      this.simulation.graph,
      true,
    )
      .onNeedsRedraw.set(() => (this.needsRedraw = true))
      .nodeStyle.set((v: GraphNode) => ({ ...defaultNodeStyle, color: v.__indexColor ?? defaultNodeStyle.color}))
      .linkStyle.set((v: GraphLink) => ({ ...defaultLinkStyle, color: v.__indexColor ?? defaultLinkStyle.color}));

    this.autoPauseRedraw = new Observable(this, true, []);
    this.graph = new LinkedObservable(this, this.simulation.graph, [
      (graphData) => {
        if ([graphData.nodes, graphData.links].every((arr) => (arr || []).every((element) => !element.__indexColor))) {
          this.colorTracker.reset();
        }

        [
          { type: "Node", objs: graphData.nodes },
          { type: "Link", objs: graphData.links },
        ].forEach(({ type, objs }) => {
          objs
            .filter((element) => {
              if (!element.__indexColor) return true;

              const cur = this.colorTracker.lookup(element.__indexColor);
              return !cur || !cur.entity || cur.entity !== element;
            })
            .forEach((element) => {
              element.__indexColor = this.colorTracker.register({ type, entity: element });
            })
        })
      }
    ])

    this.init();
    this.startRenderCycle();
  }

  public updateSimulation(cb: (root: D3Bindings) => unknown) {
    cb(this.simulation);
    return this;
  }
  public updateForegroundRender(cb: (root: Canvas2DGraphRender) => unknown) {
    cb(this.foregroundRender);
    return this;
  }
  public updateMouseTrackingRender(cb: (root: Canvas2DGraphRender) => unknown) {
    cb(this.mouseInteractionRender);
    return this;
  }

  private getObjUnderPointer() {
    const pxScale = window.devicePixelRatio;
    const px =
      this.pointerPos.x > 0 && this.pointerPos.y > 0
        ? this.shadowCanvasContext.getImageData(this.pointerPos.x * pxScale, this.pointerPos.y * pxScale, 1, 1)
        : null;

    // Lookup object per pixel color
    if (px) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.colorTracker.lookup(px.data as any);
    }
    return null;
  };

  private init() {
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
            // release engine low intensity
            // let the engine readjust after releasing fixed nodes
            this.simulation.d3AlphaTarget.set(0).resetCountdown();
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
          this.simulation.graph.value.nodes.length
        ) {
          this.zoom.scaleTo(
            this.zoom.__baseElem,
            (this.lastSetZoom =
              ZOOM2NODES_FACTOR / Math.cbrt(this.simulation.graph.value.nodes.length)),
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

    this.isInitialized = true;
  }

  private startRenderCycle() {
    const refreshShadowCanvas = throttle(() => {
      // wipe canvas
      clearCanvas(this.shadowCanvasContext, this.dimensions.value.width, this.dimensions.value.height);

      // redraw
      const t = d3ZoomTransform(this.canvas);
      this.mouseInteractionRender.globalScale.set(t.k).tick();
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
        this.foregroundRender.globalScale.set(globalScale).tick();
        // state?.onRenderFramePost?.(ctx, globalScale);
      }

      this.animationFrameRequestId = requestAnimationFrame(animationCycle);
    }

    this.animationCycle = animationCycle;
    animationCycle();
  }

  public destructor() {
    this.pauseAnimation();
    this.simulation.destructor();
  }

  private adjustCanvasSize() {
    if (!this.isInitialized || !this.canvas) return;

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

  public graph2ScreenCoords(x: number, y: number) {
    const t = d3ZoomTransform(this.canvas);
    return { x: x * t.k + t.x, y: y * t.k + t.y };
  }

  public screen2GraphCoords(x: number, y: number) {
    const t = d3ZoomTransform(this.canvas);
    return { x: (x - t.x) / t.k, y: (y - t.y) / t.k };
  }

  public centerAt(x?: number, y?: number) {
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

  public canvasZoom(k?: number) {
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

  public zoomToFit(padding = 10, bboxArgs: null | {x: [number, number], y: [number, number]} = null) {
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

  public getGraphBbox(nodeFilter = () => true) {
    const styleGetter = this.foregroundRender.nodeStyle.value;
    const getStyle = typeof styleGetter === "function" ? styleGetter : () => styleGetter;

    const nodesPos = this.simulation.graph.value.nodes.filter(nodeFilter).map((node) => ({
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

  public pauseAnimation() {
    if (this.animationFrameRequestId) {
      cancelAnimationFrame(this.animationFrameRequestId);
      this.animationFrameRequestId = null;
    }
  }

  public resumeAnimation() {
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
