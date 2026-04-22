export const ORDER_STATUS = {
  PENDING_APPROVAL: "pending_approval",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const ORDER_STATUS_FLOW = [
  ORDER_STATUS.PENDING_APPROVAL,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
] as const;

const LEGACY_MAP: Record<string, string> = {
  pending: ORDER_STATUS.PENDING_APPROVAL,
  approved: ORDER_STATUS.CONFIRMED,
  fulfilled: ORDER_STATUS.DELIVERED,
  completed: ORDER_STATUS.DELIVERED,
  rejected: ORDER_STATUS.CANCELLED,
};

export function normalizeOrderStatus(status: string | null | undefined): string {
  if (!status) return ORDER_STATUS.PENDING_APPROVAL;
  return LEGACY_MAP[status] || status;
}

export function orderStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeOrderStatus(status);
  if (normalized === ORDER_STATUS.PENDING_APPROVAL) return "Awaiting Approval";
  return normalized.replace(/_/g, " ");
}

