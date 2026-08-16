/**
 * Raw/clean data domain types.
 * See requirements doc section 6.2.
 * NOTE: the requirements doc's directory listing (3.2) does not mention a
 * dedicated types/data.ts file, but DataState is defined in 6.2 and needs a
 * home - it did not fit cleanly into any other types/*.ts file, so it is
 * split out here for consistency with the rest of the types/ directory.
 */
export type DataState = {
  /** TB, unrefined. */
  rawData: number;
  /** TB, refined and usable for training. */
  cleanData: number;
  /** TB gained per manual "Collect Raw Data" click. */
  manualDataPerClick: number;
  /** TB refined per manual "Clean Data" click. */
  manualCleanPerClick: number;
  /**
   * Early Game Milestone & Balance Sprint: lifetime totals, monotonically
   * increasing (never decrease when rawData/cleanData is spent on training
   * or a Data Cleaning Contract). rawData/cleanData themselves are current
   * STOCK and get consumed, so "collect 25TB" style objectives read these
   * instead - otherwise a milestone could un-complete itself the moment the
   * player spends the data they collected.
   */
  totalRawDataCollected: number;
  totalCleanDataProduced: number;
};
