import { useEffect } from "react";
import { useMarineSnapshot, snapshotBundle } from "./snapshot";
import type { Coords } from "./geo";
/** All active surfaces share one backend payload and one request identity. */
export function useMarine(coords: Coords | null) {
  const state = useMarineSnapshot();
  useEffect(() => { if(coords) state.activate(); }, [coords?.lat, coords?.lon, state.activate]);
  return { ...state, data: state.snapshot ? snapshotBundle(state.snapshot,state.offline) : undefined };
}
