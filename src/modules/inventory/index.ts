/** Inventory module — public facade (Contract §4). */
export { StockTable } from "./components/StockTable";
export { GrnForm } from "./components/GrnForm";
export { AdjustmentForm } from "./components/AdjustmentForm";
export { getBatches } from "./api";
export * from "./types";
export { ADJUSTMENT_REASONS } from "./schemas";
