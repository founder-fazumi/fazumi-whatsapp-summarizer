import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { AdminChartPoint, AdminOverviewMetrics } from "@/lib/admin/types";

const COLORS = {
  primaryRgb: "0.141 0.439 0.322",
  accentRgb: "0.898 0.631 0.361",
  destructiveRgb: "0.761 0.302 0.259",
  backgroundRgb: "0.961 0.949 0.925",
  surfaceRgb: "1 1 1",
  surfaceMutedRgb: "0.945 0.961 0.941",
  textRgb: "0.102 0.192 0.161",
  mutedRgb: "0.392 0.455 0.427",
  dividerRgb: "0.847 0.886 0.863",
} as const;

interface AdminExportRow {
  tier: string;
  metric: string;
  value: string;
  benchmark: string;
  notes: string;
}

interface PdfTextOptions {
  x: number;
  y: number;
  size: number;
  text: string;
  color?: string;
  font?: "F1" | "F2";
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatGeneratedAt(value: string) {
  return formatDate(value, "en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function wrapPdfText(text: string, maxCharacters: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxCharacters) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function truncatePdfText(text: string, maxCharacters: number) {
  if (text.length <= maxCharacters) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxCharacters - 3))}...`;
}

function pushText(commands: string[], options: PdfTextOptions) {
  const {
    x,
    y,
    size,
    text,
    color = COLORS.textRgb,
    font = "F2",
  } = options;

  commands.push("BT");
  commands.push(`/${font} ${size} Tf`);
  commands.push(`${color} rg`);
  commands.push(`1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj`);
  commands.push("ET");
}

function pushWrappedText(
  commands: string[],
  {
    x,
    y,
    size,
    text,
    maxCharacters,
    lineHeight,
    color = COLORS.mutedRgb,
    font = "F2",
  }: PdfTextOptions & {
    maxCharacters: number;
    lineHeight?: number;
  }
) {
  wrapPdfText(text, maxCharacters).forEach((line, index) => {
    pushText(commands, {
      x,
      y: y - (index * (lineHeight ?? size + 2)),
      size,
      text: line,
      color,
      font,
    });
  });
}

function pushRect(
  commands: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  strokeColor?: string
) {
  commands.push(`${fillColor} rg`);
  commands.push(`${x} ${y} ${width} ${height} re f`);

  if (strokeColor) {
    commands.push(`${strokeColor} RG`);
    commands.push("0.7 w");
    commands.push(`${x} ${y} ${width} ${height} re S`);
  }
}

function pushLine(
  commands: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeColor: string,
  width = 1
) {
  commands.push(`${strokeColor} RG`);
  commands.push(`${width} w`);
  commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
}

function buildLineChartCommands(
  points: AdminChartPoint[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  const commands: string[] = [];
  const plotHeight = height - 18;

  [0, 0.5, 1].forEach((ratio) => {
    const axisY = y + (plotHeight * ratio);
    pushLine(commands, x, axisY, x + width, axisY, COLORS.dividerRgb, ratio === 0 ? 1 : 0.6);
  });

  if (points.length === 0) {
    return commands;
  }

  const maxValue = Math.max(...points.map((point) => point.count), 1);
  const normalized = points.map((point, index) => {
    const pointX = x + (index / Math.max(points.length - 1, 1)) * width;
    const pointY = y + ((point.count / maxValue) * plotHeight);

    return { x: pointX, y: pointY };
  });

  commands.push(`${color} RG`);
  commands.push("2.2 w");
  normalized.forEach((point, index) => {
    commands.push(`${point.x} ${point.y} ${index === 0 ? "m" : "l"}`);
  });
  commands.push("S");

  normalized.forEach((point) => {
    commands.push(`${color} rg`);
    commands.push(`${point.x - 2.5} ${point.y - 2.5} 5 5 re f`);
  });

  return commands;
}

function buildBarChartCommands(
  values: Array<{ label: string; count: number }>,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  const commands: string[] = [];
  const maxValue = Math.max(...values.map((value) => value.count), 1);
  const gap = 10;
  const barWidth =
    (width - (gap * Math.max(values.length - 1, 0))) / Math.max(values.length, 1);

  values.forEach((value, index) => {
    const barHeight = Math.max((value.count / maxValue) * height, value.count > 0 ? 8 : 2);
    const barX = x + (index * (barWidth + gap));

    commands.push(`${color} rg`);
    commands.push(`${barX} ${y} ${barWidth} ${barHeight} re f`);
  });

  return commands;
}

function buildPdfDocument(content: string) {
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>endobj\n",
    `4 0 obj<< /Length ${Buffer.byteLength(content, "utf8")} >>stream\n${content}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n",
    "6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export function buildAdminExportRows(metrics: AdminOverviewMetrics): AdminExportRow[] {
  return [
    {
      tier: "Executive",
      metric: "MRR",
      value: formatCurrency(metrics.revenue.mrr, "USD", 2),
      benchmark: "Target > 10% MoM growth",
      notes: `${formatNumber(metrics.growthPulse.mrrGrowthTrend, {
        maximumFractionDigits: 1,
      })}% growth vs prior run-rate`,
    },
    {
      tier: "Executive",
      metric: "Activation",
      value: `${formatNumber(metrics.activation.activationRate, {
        maximumFractionDigits: 1,
      })}%`,
      benchmark: "Healthy > 40%",
      notes: `TTFV ${formatNumber(metrics.activation.timeToFirstValueHours, {
        maximumFractionDigits: 1,
      })}h`,
    },
    {
      tier: "Executive",
      metric: "Churn",
      value: `${formatNumber(metrics.churn.churnRate, {
        maximumFractionDigits: 1,
      })}%`,
      benchmark: "Healthy < 3%",
      notes: `${formatNumber(metrics.retentionWarning.churnRiskUsers)} users at risk`,
    },
    {
      tier: "Executive",
      metric: "LTV:CAC",
      value: `${formatNumber(metrics.userIntelligence.ltvToCacRatio, {
        maximumFractionDigits: 1,
      })}:1`,
      benchmark: "Healthy > 3:1",
      notes: `LTV ${formatCurrency(metrics.userIntelligence.averageLtv, "USD", 2)}`,
    },
    {
      tier: "Operations",
      metric: "AI Spend (7d)",
      value: formatCurrency(metrics.aiUsage.spendLast7Days, "USD", 2),
      benchmark: `Budget ${formatCurrency(metrics.aiUsage.spendLimit, "USD", 0)}`,
      notes: `${formatCurrency(metrics.aiUsage.costPerSummary, "USD", 4)} per summary`,
    },
    {
      tier: "Operations",
      metric: "Failed Payments",
      value: formatNumber(metrics.revenueIntelligence.failedPayments),
      benchmark: "Target 0",
      notes: `${formatCurrency(metrics.revenueIntelligence.expectedPayoutUsd, "USD", 2)} payout`,
    },
  ];
}

export function createAdminMetricsCsv(metrics: AdminOverviewMetrics) {
  const rows = buildAdminExportRows(metrics);
  const header = [
    "Generated At (UTC)",
    "Tier",
    "Metric",
    "Value",
    "Benchmark",
    "Notes",
  ];
  const lines = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      [
        formatGeneratedAt(metrics.generatedAt),
        row.tier,
        row.metric,
        row.value,
        row.benchmark,
        row.notes,
      ]
        .map(escapeCsvCell)
        .join(",")
    ),
  ];

  return lines.join("\n");
}

export function createAdminMetricsPdf(metrics: AdminOverviewMetrics) {
  const commands: string[] = [];
  const rows = buildAdminExportRows(metrics);
  const kpis = [
    {
      label: "MRR",
      value: formatCurrency(metrics.revenue.mrr, "USD", 2),
      note: `${formatNumber(metrics.growthPulse.mrrGrowthTrend, {
        maximumFractionDigits: 1,
      })}% MoM momentum`,
      tone: COLORS.primaryRgb,
    },
    {
      label: "Active Users",
      value: formatNumber(metrics.engagement.dau),
      note: `${formatNumber(metrics.engagement.dauMauRatio, {
        maximumFractionDigits: 1,
      })}% DAU/MAU`,
      tone: COLORS.accentRgb,
    },
    {
      label: "Churn Rate",
      value: `${formatNumber(metrics.churn.churnRate, {
        maximumFractionDigits: 1,
      })}%`,
      note: `${formatNumber(metrics.retentionWarning.churnRiskUsers)} users at risk`,
      tone:
        metrics.churn.churnRate < 3 ? COLORS.primaryRgb : COLORS.destructiveRgb,
    },
    {
      label: "New Users 7d",
      value: formatNumber(metrics.newUsers.last7Days),
      note: `${formatNumber(metrics.conversion.conversionRate, {
        maximumFractionDigits: 1,
      })}% paid conversion`,
      tone: COLORS.accentRgb,
    },
    {
      label: "Founder Seats",
      value: `${formatNumber(metrics.founder.remaining)} remaining`,
      note: `${formatNumber(metrics.founder.sold)}/${formatNumber(metrics.founder.capacity)} sold`,
      tone: COLORS.primaryRgb,
    },
  ];
  const planBars = metrics.revenueIntelligence.planDistribution.map((row) => ({
    label: row.planType,
    count: row.purchases,
  }));

  pushRect(commands, 0, 0, 595, 842, COLORS.backgroundRgb);
  pushRect(commands, 32, 760, 531, 58, COLORS.primaryRgb);
  pushText(commands, {
    x: 48,
    y: 792,
    size: 24,
    text: "FAZUMI",
    color: COLORS.surfaceRgb,
    font: "F1",
  });
  pushText(commands, {
    x: 48,
    y: 774,
    size: 12,
    text: "Founder Control Center Report",
    color: COLORS.surfaceRgb,
    font: "F2",
  });
  pushText(commands, {
    x: 48,
    y: 760,
    size: 9,
    text: `Generated UTC: ${formatGeneratedAt(metrics.generatedAt)}`,
    color: "0.90 0.95 0.92",
    font: "F2",
  });

  pushRect(commands, 430, 775, 115, 24, COLORS.accentRgb);
  pushText(commands, {
    x: 442,
    y: 783,
    size: 9,
    text: "A4 portrait | EN / AR",
    color: COLORS.textRgb,
    font: "F1",
  });

  pushText(commands, {
    x: 40,
    y: 734,
    size: 15,
    text: "Executive Summary",
    color: COLORS.textRgb,
    font: "F1",
  });
  pushText(commands, {
    x: 40,
    y: 718,
    size: 9,
    text: "Five KPI cards at the top-left keep the daily founder scan fast and actionable.",
    color: COLORS.mutedRgb,
    font: "F2",
  });

  const topCards = [
    { x: 40, y: 626, width: 168, height: 76 },
    { x: 220, y: 626, width: 168, height: 76 },
    { x: 40, y: 536, width: 168, height: 76 },
    { x: 220, y: 536, width: 168, height: 76 },
    { x: 40, y: 446, width: 348, height: 76 },
  ];

  kpis.forEach((kpi, index) => {
    const frame = topCards[index];

    pushRect(
      commands,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      COLORS.surfaceRgb,
      COLORS.dividerRgb
    );
    pushRect(commands, frame.x, frame.y + frame.height - 5, frame.width, 5, kpi.tone);
    pushText(commands, {
      x: frame.x + 14,
      y: frame.y + frame.height - 22,
      size: 9,
      text: kpi.label.toUpperCase(),
      color: COLORS.mutedRgb,
      font: "F1",
    });
    pushText(commands, {
      x: frame.x + 14,
      y: frame.y + 30,
      size: 18,
      text: kpi.value,
      color: COLORS.textRgb,
      font: "F1",
    });
    pushWrappedText(commands, {
      x: frame.x + 14,
      y: frame.y + 16,
      size: 8,
      text: kpi.note,
      maxCharacters: index === 4 ? 42 : 22,
      lineHeight: 9,
      color: COLORS.mutedRgb,
      font: "F2",
    });
  });

  pushRect(commands, 404, 446, 159, 256, COLORS.surfaceRgb, COLORS.dividerRgb);
  pushText(commands, {
    x: 420,
    y: 678,
    size: 12,
    text: "Founder Cues",
    color: COLORS.textRgb,
    font: "F1",
  });
  pushWrappedText(commands, {
    x: 420,
    y: 660,
    size: 8,
    text: "Right-rail notes mirror the Chinese dashboard pattern: show action cues beside the KPI scan.",
    maxCharacters: 29,
    lineHeight: 10,
    color: COLORS.mutedRgb,
    font: "F2",
  });

  const cueRows = [
    `Payout forecast ${formatCurrency(metrics.revenueIntelligence.expectedPayoutUsd, "USD", 2)}`,
    `AI spend 7d ${formatCurrency(metrics.aiUsage.spendLast7Days, "USD", 2)}`,
    `Push subscribed ${formatNumber(metrics.notifications.subscribedUsers)}`,
    `Alerts open ${formatNumber(metrics.alerts.criticalFeedback + metrics.alerts.paymentFailures)}`,
  ];

  cueRows.forEach((row, index) => {
    pushRect(commands, 420, 608 - (index * 28), 126, 20, COLORS.surfaceMutedRgb);
    pushText(commands, {
      x: 428,
      y: 615 - (index * 28),
      size: 8,
      text: truncatePdfText(row, 28),
      color: COLORS.textRgb,
      font: "F2",
    });
  });

  pushRect(commands, 434, 470, 90, 90, COLORS.surfaceMutedRgb, COLORS.accentRgb);
  pushLine(commands, 442, 478, 516, 552, COLORS.accentRgb, 1.2);
  pushLine(commands, 516, 478, 442, 552, COLORS.accentRgb, 1.2);
  pushRect(commands, 451, 495, 20, 20, COLORS.primaryRgb);
  pushRect(commands, 488, 513, 20, 20, COLORS.primaryRgb);
  pushRect(commands, 488, 478, 20, 20, COLORS.accentRgb);
  pushText(commands, {
    x: 446,
    y: 458,
    size: 8,
    text: "Share QR placeholder",
    color: COLORS.mutedRgb,
    font: "F2",
  });

  pushRect(commands, 40, 252, 348, 172, COLORS.surfaceRgb, COLORS.dividerRgb);
  pushText(commands, {
    x: 56,
    y: 400,
    size: 12,
    text: "7-Day Growth Momentum",
    color: COLORS.textRgb,
    font: "F1",
  });
  pushText(commands, {
    x: 56,
    y: 386,
    size: 8,
    text: "Momentum uses the Fazumi green primary so positive movement is easy to scan.",
    color: COLORS.mutedRgb,
    font: "F2",
  });
  buildLineChartCommands(
    metrics.growthPulse.sevenDayMomentum,
    56,
    286,
    316,
    82,
    COLORS.primaryRgb
  ).forEach((command) => commands.push(command));
  metrics.growthPulse.sevenDayMomentum.forEach((point, index) => {
    const labelX = 56 + (index / Math.max(metrics.growthPulse.sevenDayMomentum.length - 1, 1)) * 316;
    pushText(commands, {
      x: labelX - 10,
      y: 270,
      size: 7,
      text: truncatePdfText(point.label, 5),
      color: COLORS.mutedRgb,
      font: "F2",
    });
  });

  pushRect(commands, 404, 252, 159, 172, COLORS.surfaceRgb, COLORS.dividerRgb);
  pushText(commands, {
    x: 420,
    y: 400,
    size: 12,
    text: "Plan Mix",
    color: COLORS.textRgb,
    font: "F1",
  });
  buildBarChartCommands(planBars, 420, 286, 122, 74, COLORS.accentRgb).forEach((command) =>
    commands.push(command)
  );
  planBars.forEach((bar, index) => {
    const labelX = 420 + (index * 44);
    pushText(commands, {
      x: labelX,
      y: 270,
      size: 7,
      text: truncatePdfText(bar.label, 6),
      color: COLORS.mutedRgb,
      font: "F2",
    });
    pushText(commands, {
      x: labelX,
      y: 362,
      size: 7,
      text: formatNumber(bar.count),
      color: COLORS.textRgb,
      font: "F1",
    });
  });

  pushRect(commands, 40, 70, 523, 160, COLORS.surfaceRgb, COLORS.dividerRgb);
  pushRect(commands, 40, 202, 523, 28, COLORS.primaryRgb);
  pushText(commands, {
    x: 52,
    y: 212,
    size: 11,
    text: "Operations Detail Table",
    color: COLORS.surfaceRgb,
    font: "F1",
  });

  const tableColumns = [
    { label: "Tier", x: 52, width: 64 },
    { label: "Metric", x: 120, width: 92 },
    { label: "Value", x: 216, width: 92 },
    { label: "Benchmark", x: 312, width: 100 },
    { label: "Notes", x: 416, width: 130 },
  ];

  pushRect(commands, 40, 176, 523, 24, COLORS.surfaceMutedRgb);
  tableColumns.forEach((column) => {
    pushText(commands, {
      x: column.x,
      y: 184,
      size: 8,
      text: column.label,
      color: COLORS.textRgb,
      font: "F1",
    });
  });

  rows.forEach((row, index) => {
    const rowY = 152 - (index * 20);

    if (index % 2 === 0) {
      pushRect(commands, 40, rowY, 523, 20, COLORS.surfaceMutedRgb);
    }

    pushText(commands, {
      x: 52,
      y: rowY + 7,
      size: 7,
      text: truncatePdfText(row.tier, 10),
      color: COLORS.textRgb,
      font: "F2",
    });
    pushText(commands, {
      x: 120,
      y: rowY + 7,
      size: 7,
      text: truncatePdfText(row.metric, 15),
      color: COLORS.textRgb,
      font: "F2",
    });
    pushText(commands, {
      x: 216,
      y: rowY + 7,
      size: 7,
      text: truncatePdfText(row.value, 16),
      color: COLORS.textRgb,
      font: "F1",
    });
    pushText(commands, {
      x: 312,
      y: rowY + 7,
      size: 7,
      text: truncatePdfText(row.benchmark, 18),
      color: COLORS.mutedRgb,
      font: "F2",
    });
    pushText(commands, {
      x: 416,
      y: rowY + 7,
      size: 7,
      text: truncatePdfText(row.notes, 26),
      color: COLORS.mutedRgb,
      font: "F2",
    });
  });

  pushLine(commands, 40, 58, 563, 58, COLORS.dividerRgb, 0.8);
  pushText(commands, {
    x: 40,
    y: 44,
    size: 8,
    text: "Fazumi | School chat summaries instantly | Chinese dashboard export pattern",
    color: COLORS.mutedRgb,
    font: "F2",
  });
  pushText(commands, {
    x: 510,
    y: 44,
    size: 8,
    text: "Page 1 / 1",
    color: COLORS.mutedRgb,
    font: "F2",
  });

  return buildPdfDocument(commands.join("\n"));
}
