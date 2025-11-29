/* eslint-disable @typescript-eslint/no-explicit-any */
import { select as d3Select, pointer as d3Pointer, type Selection } from "d3-selection";
import Kapsule from "../kapsule";

import "./index.css";

// Source (MIT, made by vasturiano, changed by sem0ark to remove react/preact deps)
// https://github.com/vasturiano/float-tooltip/blob/master/src/index.js

export default Kapsule({
  props: {
    content: { default: false },
    offsetX: { default: null as null | number, triggerUpdate: false },
    offsetY: { default: null as null | number, triggerUpdate: false },
  },
  methods: {},
  aliases: {},

  stateInit(cfg: {
    domNode: any;
    tooltipEl: Selection<HTMLDivElement, any, any, any>;
    style?: CSSStyleDeclaration;
  }) {
    return {style: {}, ...cfg};
  },
  init(state, { style }) {
    const domNode = state.domNode;
    const isD3Selection =
      !!domNode &&
      typeof domNode === "object" &&
      !!domNode.node &&
      typeof domNode.node === "function";
    const el = d3Select(isD3Selection ? domNode.node() : domNode);

    // make sure container is positioned, to provide anchor for tooltip
    if (el.style("position") === "static") el.style("position", "relative");

    state.tooltipEl = el.append("div").attr("class", "float-tooltip-kap");

    Object.entries(style as any).forEach(([k, v]) => state.tooltipEl.style(k, v as any));
    state.tooltipEl // start off-screen
      .style("left", "-10000px")
      .style("display", "none");

    const evSuffix = `tooltip-${Math.round(Math.random() * 1e12)}`;
    state.mouseInside = false;
    el.on(`mousemove.${evSuffix}`, (ev: MouseEvent) => {
      state.mouseInside = true;

      const mousePos = d3Pointer(ev);

      const domNode = el.node();
      const canvasWidth = domNode.offsetWidth;
      const canvasHeight = domNode.offsetHeight;

      const translate = [
        state.offsetX === null || state.offsetX === undefined
          ? // auto: adjust horizontal position to not exceed canvas boundaries
            `-${(mousePos[0] / canvasWidth) * 100}%`
          : typeof state.offsetX === "number"
            ? `calc(-50% + ${state.offsetX}px)`
            : state.offsetX,
        state.offsetY === null || state.offsetY === undefined
          ? // auto: flip to above if near bottom
            canvasHeight > 130 && canvasHeight - mousePos[1] < 100
            ? "calc(-100% - 6px)"
            : "21px"
          : typeof state.offsetY === "number"
            ? state.offsetY < 0
              ? `calc(-100% - ${Math.abs(state.offsetY)}px)`
              : `${state.offsetY}px`
            : state.offsetY,
      ];

      state.tooltipEl
        .style("left", mousePos[0] + "px")
        .style("top", mousePos[1] + "px")
        .style("transform", `translate(${translate.join(",")})`);

      if (state.content) state.tooltipEl.style("display", "inline");
    });

    el.on(`mouseover.${evSuffix}`, () => {
      state.mouseInside = true;
      if (state.content) state.tooltipEl.style("display", "inline");
    });
    el.on(`mouseout.${evSuffix}`, () => {
      state.mouseInside = false;
      state.tooltipEl.style("display", "none");
    });
  },

  update: function (state) {
    state.tooltipEl.style(
      "display",
      !!state.content && state.mouseInside ? "inline" : "none",
    );

    if (!state.content) {
      state.tooltipEl.text("");
    } else if (state.content instanceof HTMLElement) {
      state.tooltipEl.text(""); // empty it
      state.tooltipEl.append((() => state.content as any));
    } else if (typeof state.content === "string") {
      state.tooltipEl.html(state.content);
    } else {
      state.tooltipEl.style("display", "none");
      console.warn(
        "Tooltip content is invalid, skipping.",
        state.content,
        state.content.toString(),
      );
    }
  },
});
