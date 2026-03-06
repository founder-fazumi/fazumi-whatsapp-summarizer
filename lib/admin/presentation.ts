import type { AdminMetricStatus } from "@/lib/admin/types";

export function getRevenueStatus(mrrTrend: number): AdminMetricStatus {
  if (mrrTrend >= 5) {
    return "good";
  }

  if (mrrTrend >= 0) {
    return "warning";
  }

  return "critical";
}

export function getChurnStatus(churnRate: number): AdminMetricStatus {
  if (churnRate < 5) {
    return "good";
  }

  if (churnRate < 8) {
    return "warning";
  }

  return "critical";
}

export function getEngagementStatus(dauMauRatio: number): AdminMetricStatus {
  if (dauMauRatio >= 20) {
    return "good";
  }

  if (dauMauRatio >= 12) {
    return "warning";
  }

  return "critical";
}

export function getCacStatus(cac: number): AdminMetricStatus {
  if (cac === 0 || cac < 500) {
    return "good";
  }

  if (cac < 800) {
    return "warning";
  }

  return "critical";
}

export function getLtvStatus(ltvToCacRatio: number): AdminMetricStatus {
  if (ltvToCacRatio >= 3) {
    return "good";
  }

  if (ltvToCacRatio >= 2) {
    return "warning";
  }

  return "critical";
}

export function getConversionStatus(conversionRate: number): AdminMetricStatus {
  if (conversionRate >= 5) {
    return "good";
  }

  if (conversionRate >= 2) {
    return "warning";
  }

  return "critical";
}

export function getFounderStatus(percentage: number): AdminMetricStatus {
  if (percentage < 70) {
    return "good";
  }

  if (percentage < 90) {
    return "warning";
  }

  return "critical";
}

export function getStatusLabel(status: AdminMetricStatus) {
  switch (status) {
    case "good":
      return "Healthy";
    case "warning":
      return "Watch";
    case "critical":
      return "Alert";
    default:
      return "Neutral";
  }
}
