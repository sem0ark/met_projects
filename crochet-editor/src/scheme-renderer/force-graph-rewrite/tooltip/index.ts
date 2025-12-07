/* eslint-disable @typescript-eslint/no-explicit-any */
import { select as d3Select, pointer as d3Pointer, type Selection } from "d3-selection";

import "./index.css";
import { Observable } from "../observable";

// Source (MIT, made by vasturiano, changed by sem0ark to remove react/preact deps)
// https://github.com/vasturiano/float-tooltip/blob/master/src/index.js

export class Tooltip {
  public readonly content: Observable<string | HTMLElement | null, this>;
  public readonly offsetX: Observable<number | null, this>;
  public readonly offsetY: Observable<number | null, this>;

  private domNode: any;
  private tooltipEl: Selection<HTMLDivElement, any, any, any>;
  private mouseInside: boolean;

  constructor(
    domNode: any,
    style: Partial<CSSStyleDeclaration> = {},
  ) {
    this.content = new Observable(this, null as null | string | HTMLElement, [
      () => this.update(),
    ]);
    this.offsetX = new Observable(this, null as null | number, []);
    this.offsetY = new Observable(this, null as null | number, []);

    this.domNode = domNode;
    this.mouseInside = false;

    const isD3Selection =
      !!this.domNode &&
      typeof this.domNode === "object" &&
      !!this.domNode.node &&
      typeof this.domNode.node === "function";
    const el = d3Select(isD3Selection ? this.domNode.node() : this.domNode);

    // make sure container is positioned, to provide anchor for tooltip
    if (el.style("position") === "static") el.style("position", "relative");

    this.tooltipEl = el.append("div").attr("class", "float-tooltip-kap");

    Object.entries(style).forEach(([k, v]) => this.tooltipEl.style(k, v as any));
    this.tooltipEl // start off-screen
      .style("left", "-10000px")
      .style("display", "none");

    const evSuffix = `tooltip-${Math.round(Math.random() * 1e12)}`;
    el.on(`mousemove.${evSuffix}`, (ev: MouseEvent) => {
      this.mouseInside = true;

      const mousePos = d3Pointer(ev);

      const domNode = el.node();
      const canvasWidth = domNode.offsetWidth;
      const canvasHeight = domNode.offsetHeight;

      const translate = [
        this.offsetX === null || this.offsetX === undefined
          ? // auto: adjust horizontal position to not exceed canvas boundaries
            `-${(mousePos[0] / canvasWidth) * 100}%`
          : typeof this.offsetX === "number"
            ? `calc(-50% + ${this.offsetX}px)`
            : this.offsetX,
        this.offsetY === null || this.offsetY === undefined
          ? // auto: flip to above if near bottom
            canvasHeight > 130 && canvasHeight - mousePos[1] < 100
            ? "calc(-100% - 6px)"
            : "21px"
          : typeof this.offsetY === "number"
            ? this.offsetY < 0
              ? `calc(-100% - ${Math.abs(this.offsetY)}px)`
              : `${this.offsetY}px`
            : this.offsetY,
      ];

      this.tooltipEl
        .style("left", mousePos[0] + "px")
        .style("top", mousePos[1] + "px")
        .style("transform", `translate(${translate.join(",")})`);

      if (this.content) this.tooltipEl.style("display", "inline");
    });

    el.on(`mouseover.${evSuffix}`, () => {
      this.mouseInside = true;
      if (this.content) this.tooltipEl.style("display", "inline");
    });
    el.on(`mouseout.${evSuffix}`, () => {
      this.mouseInside = false;
      this.tooltipEl.style("display", "none");
    });
  }

  private update() {
    this.tooltipEl.style(
      "display",
      !!this.content && this.mouseInside ? "inline" : "none",
    );

    if (!this.content) {
      this.tooltipEl.text("");
    } else if (this.content instanceof HTMLElement) {
      this.tooltipEl.text(""); // empty it
      this.tooltipEl.append((() => this.content as any));
    } else if (typeof this.content === "string") {
      this.tooltipEl.html(this.content);
    } else {
      this.tooltipEl.style("display", "none");
      console.warn(
        "Tooltip content is invalid, skipping.",
        this.content,
        this.content.toString(),
      );
    }
  }
}
