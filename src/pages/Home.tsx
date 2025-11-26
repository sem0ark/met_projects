import { useCallback, useEffect } from 'react';
import { useGraphStoreShallow } from '../store/graph-store'

export const Home = () => {
  const graphContainer = document.getElementById("graph-container");
  if (graphContainer) graphContainer.hidden = false;

  const { moveFocusDown, moveFocusUp, moveFocusLeft, moveFocusRight } = useGraphStoreShallow((state) => state.actions)

  const onKeyDown = useCallback((ev: KeyboardEvent) => {
    if (ev.key === "ArrowUp") moveFocusUp();
    if (ev.key === "ArrowDown") moveFocusDown();
    if (ev.key === "ArrowLeft") moveFocusLeft();
    if (ev.key === "ArrowRight") moveFocusRight();
  }, [moveFocusDown, moveFocusUp, moveFocusLeft, moveFocusRight])

  useEffect(() => {
    addEventListener("keydown", onKeyDown)
    return () => removeEventListener("keydown", onKeyDown)
  }, [onKeyDown])

  return <div></div>;
}
