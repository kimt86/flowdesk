import { NextRequest, NextResponse } from "next/server";
import { listPlans } from "@/lib/plans";

// GET /api/plans?project=<projectId>
export async function GET(req: NextRequest) {
  try {
    const project = req.nextUrl.searchParams.get("project");

    if (!project) {
      return NextResponse.json(
        { error: "project query parameter is required" },
        { status: 400 }
      );
    }

    const plans = listPlans(project);
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("[GET /api/plans]", err);
    return NextResponse.json(
      { error: "Failed to read plans" },
      { status: 500 }
    );
  }
}
