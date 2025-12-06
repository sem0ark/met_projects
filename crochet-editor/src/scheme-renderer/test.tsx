import { useCallback, useEffect, useRef } from "react";
import { GraphControllerCanvas2D } from "./force-graph-rewrite/force-graph-renderer";
import { D3Bindings, d3ForceCollide, d3ForceManyBody } from "./force-graph-rewrite/force-graph-d3-bindings";
import type { GraphLink } from "./force-graph-rewrite/observable-graph";

export const SchemaEditor = ({className}: {
  className?: string
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GraphControllerCanvas2D>(undefined);

  const getSize = useCallback(() => {
    if (!ref.current) return [0, 0];

    const style = getComputedStyle(ref.current);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const borderX = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const availableWidth = ref.current.offsetWidth - paddingX - borderX;
    const availableHeight = ref.current.offsetHeight - paddingY - borderY;

    return [availableWidth, availableHeight];
  }, []);

  // One-time instantiation and configuration
  useEffect(() => {
    if (!ref.current || controllerRef.current) return; // Prevent re-instantiation
    // Random tree
    const N = 200;
    const gData = {
      nodes: [...Array(N).keys()].map(i => ({ id: i })),
      links: [...Array(N).keys()]
        .filter(id => id)
        .map(id => ({
          source: id,
          target: Math.round(Math.random() * (id-1)),
          type: Math.random() > 0.5 ? "long" : "short"
        }))
    };

    // const instance = new SchemaController(new GraphController();
    const [availableWidth, availableHeight] = getSize();
    controllerRef.current = new GraphControllerCanvas2D(
      new D3Bindings(gData),
      ref.current,
      {
        width: availableWidth,  
        height: availableHeight,
      }
    )
      .updateSimulation(sim => {
        const linkForce = sim.createLinkForce("links");
        linkForce.distance((link) => (link as GraphLink).type === "short" ? 50 : 200).strength(1).iterations(10);

        sim.setForce("collide", d3ForceCollide().radius(5));
        sim.setForce("charge", d3ForceManyBody());
      })
      .updateForegroundRender(graph => {
        const prev = graph.linkStyle.value;

        graph.linkStyle.set((link) => ({
          ...prev(link),
          color: (() => {
            if (link.type === "short") return "blue";
            if (link.type === "long") return "red";
            return "yellow";
          })(),
        }))
      });

  }, [getSize]);

  // Init view configuration
  useEffect(() => {
    if (!controllerRef.current) return;
    const [availableWidth, availableHeight] = getSize();
    controllerRef.current.dimensions.set({
      width: availableWidth,
      height: availableHeight,
    });
  }, [getSize]);

  // const onKeyDown = useCallback(
  //   (ev: KeyboardEvent) => {
  //     if (!controllerRef.current) return;
  //     const controller = controllerRef.current;

  //     const isChangingTargetStitch = !ev.shiftKey;
  //     const currentNode = isChangingTargetStitch ? controller.getTargetStitch() : controller.getStartStitch();
  //     const moveByDirection = (dirX: number, dirY: number) => {
  //       const target = controller.schemaView.getClosestByDirection(currentNode, dirX, dirY);
  //       console.log(dirX, dirY, target === currentNode);

  //       if (target === currentNode) return false;
  //       if (isChangingTargetStitch) {
  //         controller.setTargetStitch(target);
  //       } else {
  //         controller.setStartStitch(target);
  //       }
  //       return true;
  //     }

  //     // Ensure that user is moving somewhere in the same direction.
  //     if (ev.key === "ArrowUp") return moveByDirection(0, -1);
  //     if (ev.key === "ArrowDown") return moveByDirection(0, 1);

  //     if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
  //       const movedStraight =
  //         (ev.key === "ArrowLeft" && moveByDirection(-1, 0)) ||
  //         (ev.key === "ArrowRight" && moveByDirection(1, 0));

  //       if (movedStraight) return true;

  //       const vecX = currentNode.x;
  //       const vecY = currentNode.y;

  //       const magnitude = Math.sqrt(vecX * vecX + vecY * vecY);
  //       if (magnitude === 0) return; // Avoid division by zero if exactly at center

  //       const unitVecX = vecX / magnitude;
  //       const unitVecY = vecY / magnitude;
  //       if (ev.key === "ArrowLeft") {
  //         return moveByDirection(unitVecY, -unitVecX);
  //       } else if (ev.key === "ArrowRight") {
  //         return moveByDirection(-unitVecY, unitVecX);
  //       }
  //     }

  //     if (ev.key === "c") {
  //       controller.addChainStitch()
  //     }

  //     if (ev.key === "l") {
  //       controller.addLinkStitch()
  //     }
  //   },
  //   [],
  // );

  // useEffect(() => {
  //   addEventListener("keydown", onKeyDown);
  //   return () => removeEventListener("keydown", onKeyDown);
  // }, [onKeyDown]);

  const onResize = useCallback(() => {
    if (!controllerRef.current) return;
    const [availableWidth, availableHeight] = getSize();
    controllerRef.current.dimensions.set({
      width: availableWidth,
      height: availableHeight,
    });
  }, [getSize]);

  useEffect(() => {
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, [onResize]);

  return (
    <div ref={ref} className={className}></div>
  );
};
