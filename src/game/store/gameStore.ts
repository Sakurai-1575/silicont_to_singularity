import { create } from "zustand";
import type { GameStore } from "../types/game";
import { createFinanceSlice } from "./slices/financeSlice";
import { createDataSlice } from "./slices/dataSlice";
import { createHardwareSlice } from "./slices/hardwareSlice";
import { createStaffSlice } from "./slices/staffSlice";
import { createTechSlice } from "./slices/techSlice";
import { createTrainingSlice } from "./slices/trainingSlice";
import { createMarketSlice } from "./slices/marketSlice";
import { createEventSlice } from "./slices/eventSlice";
import { createCompetitorsSlice } from "./slices/competitorsSlice";
import { createDepartmentSlice } from "./slices/departmentSlice";
import { createAnalyticsSlice } from "./slices/analyticsSlice";
import { createEventSystemSlice } from "./slices/eventSystemSlice";
import * as actions from "./actions";
import { loadGame } from "../utils/save";

/**
 * The root Zustand store. Composed from per-domain slices (state only - see
 * store/slices/*.ts) plus a flat set of action methods whose actual
 * validate -> update -> log logic lives in store/actions/*.ts. Actions are
 * wired here rather than attached inside each slice because most of them
 * are cross-cutting (e.g. buyGpu touches hardware, finance, and the event
 * log at once) - see store/actions/types.ts for why this is the standard
 * Zustand "slices" pattern rather than a deviation from it.
 *
 * On creation, a previously saved GameState (if any and if its saveVersion
 * matches) is loaded from localStorage and merged over the fresh slice
 * defaults, so the app resumes exactly where the player left off.
 */
export const useGameStore = create<GameStore>()((set, get, api) => {
  const baseState = {
    ...createFinanceSlice(set, get, api),
    ...createDataSlice(set, get, api),
    ...createHardwareSlice(set, get, api),
    ...createStaffSlice(set, get, api),
    ...createTechSlice(set, get, api),
    ...createTrainingSlice(set, get, api),
    ...createMarketSlice(set, get, api),
    ...createEventSlice(set, get, api),
    ...createCompetitorsSlice(set, get, api),
    ...createDepartmentSlice(set, get, api),
    ...createAnalyticsSlice(set, get, api),
    ...createEventSystemSlice(set, get, api),
  };

  const persisted = loadGame();

  return {
    ...baseState,
    ...(persisted ?? {}),

    // --- Data ---
    collectRawData: () => actions.collectRawData(get, set),
    cleanDataManual: () => actions.cleanDataManual(get, set),

    // --- Hardware ---
    buyGpu: (gpuId) => actions.buyGpu(get, set, gpuId),
    buyCooling: (coolingId) => actions.buyCooling(get, set, coolingId),
    upgradeFacility: (facilityId) => actions.upgradeFacility(get, set, facilityId),
    upgradeFacilityInternal: (category) => actions.upgradeFacilityInternal(get, set, category),
    downgradeFacility: () => actions.downgradeFacility(get, set),
    setComputeAllocation: (trainingComputeAllocation) =>
      actions.setComputeAllocation(get, set, trainingComputeAllocation),

    // --- Staff ---
    hireStaff: (role) => actions.hireStaff(get, set, role),
    fireStaff: (role, count) => actions.fireStaff(get, set, role, count),
    assignStaffToDepartment: (role, department, delta) => actions.assignStaffToDepartment(get, set, role, department, delta),

    // --- Tech ---
    unlockTech: (techId) => actions.unlockTech(get, set, techId),

    // --- Training ---
    startTraining: (modelId, learningRateMode) => actions.startTraining(get, set, modelId, learningRateMode),
    deployModel: (completedModelId) => actions.deployModel(get, set, completedModelId),
    undeployModel: (completedModelId) => actions.undeployModel(get, set, completedModelId),
    cancelTraining: () => actions.cancelTraining(get, set),
    deleteCompletedModel: (completedModelId) => actions.deleteCompletedModel(get, set, completedModelId),

    // --- Finance ---
    raiseFunding: (roundType) => actions.raiseFunding(get, set, roundType),

    // --- Enterprise License ---
    deliverEnterpriseDeal: (dealId) => actions.deliverEnterpriseDeal(get, set, dealId),

    // --- Early Game contracts ---
    claimPrototypeContract: () => actions.claimPrototypeContract(get, set),
    claimDataCleaningContract: () => actions.claimDataCleaningContract(get, set),

    // --- New revenue systems ---
    licenseModel: (completedModelId) => actions.licenseModel(get, set, completedModelId),
    sellCleanDataset: () => actions.sellCleanDataset(get, set),
    sellSyntheticDataset: () => actions.sellSyntheticDataset(get, set),
    toggleGpuRental: () => actions.toggleGpuRental(get, set),
    toggleInferenceHosting: () => actions.toggleInferenceHosting(get, set),

    // --- Company strategy ---
    chooseCompanyStrategy: (strategyId) => actions.chooseCompanyStrategy(get, set, strategyId),

    // --- System ---
    tick: () => actions.tick(get, set),
    setTimeScale: (scale) => actions.setTimeScale(get, set, scale),
    resetGame: () => actions.resetGame(get, set),
    exportSave: () => actions.exportSave(get),
    importSave: (json) => actions.importSave(get, set, json),

    // --- Save slots ---
    saveToSlot: (slot) => actions.saveToSlot(get, slot),
    loadFromSlot: (slot) => actions.loadFromSlot(get, set, slot),
    deleteSlot: (slot) => actions.deleteSlot(slot),

    // --- Debug cheats ---
    cheatAddCash: (amount) => actions.cheatAddCash(get, set, amount),
    cheatAddRawData: (amount) => actions.cheatAddRawData(get, set, amount),
    cheatAddCleanData: (amount) => actions.cheatAddCleanData(get, set, amount),
    cheatAddResearchPoints: (amount) => actions.cheatAddResearchPoints(get, set, amount),
    cheatUnlockAllTech: () => actions.cheatUnlockAllTech(get, set),
    cheatFastForward: (seconds) => actions.cheatFastForward(get, set, seconds),
  };
});
