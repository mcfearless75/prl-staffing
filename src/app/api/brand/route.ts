import { getBrandConfig } from "@/lib/brand";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(getBrandConfig());
}
