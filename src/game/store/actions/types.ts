import type { StoreApi } from "zustand";
import type { GameStore } from "../../types/game";

/** Shared get/set aliases used by every action implementation in this directory. */
export type Get = StoreApi<GameStore>["getState"];
export type Set = StoreApi<GameStore>["setState"];
