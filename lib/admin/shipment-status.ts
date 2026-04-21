import type { ShipmentStatus } from "@/lib/types";

export const SHIPMENT_STEPS: ShipmentStatus[] = [
  "forming",
  "sealed",
  "departed_cn",
  "customs",
  "arrived_us",
  "pickup_open",
  "pickup_closed",
  "archived",
];

export function nextShipmentStatus(
  current: ShipmentStatus,
): ShipmentStatus | null {
  const idx = SHIPMENT_STEPS.indexOf(current);
  if (idx < 0 || idx >= SHIPMENT_STEPS.length - 1) return null;
  return SHIPMENT_STEPS[idx + 1];
}
