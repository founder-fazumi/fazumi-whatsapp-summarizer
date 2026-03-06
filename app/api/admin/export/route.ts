import { NextRequest, NextResponse } from "next/server";
import { guardAdminApiRequest } from "@/lib/admin/auth";
import { createAdminMetricsCsv, createAdminMetricsPdf } from "@/lib/admin/export";
import { getAdminOverviewMetrics } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  try {
    const metrics = await getAdminOverviewMetrics();

    if (format === "csv") {
      return new NextResponse(createAdminMetricsCsv(metrics), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="fazumi-metrics.csv"',
        },
      });
    }

    if (format === "pdf") {
      return new NextResponse(createAdminMetricsPdf(metrics), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="fazumi-metrics.pdf"',
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid export format." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not export admin metrics.",
      },
      { status: 500 }
    );
  }
}
