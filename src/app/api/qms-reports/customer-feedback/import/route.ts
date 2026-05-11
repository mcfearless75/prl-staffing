import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import mammoth from "mammoth";

function extractRating(text: string, label: string): number {
  // Match patterns like "Overall Satisfaction: 4", "4/5", "4 out of 5", "Score: 4"
  const patterns = [
    new RegExp(`${label}[^\\d]{0,30}(\\d)\\s*\\/\\s*5`, "i"),
    new RegExp(`${label}[^\\d]{0,30}(\\d)\\s*out\\s*of\\s*5`, "i"),
    new RegExp(`${label}[^\\d]{0,20}:\\s*(\\d)`, "i"),
    new RegExp(`${label}[^\\d]{0,20}\\s+(\\d)`, "i"),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseInt(m[1]);
      if (val >= 1 && val <= 5) return val;
    }
  }
  return 0;
}

function extractField(text: string, label: string): string {
  const patterns = [
    new RegExp(`${label}[:\\s]+([^\\n\\r]{2,80})`, "i"),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().replace(/^[:\-\s]+/, "");
  }
  return "";
}

function extractRecommend(text: string): string {
  const m = text.match(/recommend[^?]*\??\s*(yes|no|maybe)/i);
  if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  if (/\byes\b/i.test(text)) return "Yes";
  return "";
}

function extractTextBlock(text: string, label: string): string {
  const m = text.match(new RegExp(`${label}[:\\s]+([\\s\\S]{5,300}?)(?:\\n\\n|\\r\\n\\r\\n|$)`, "i"));
  return m ? m[1].trim() : "";
}

function parseDocument(raw: string) {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const companyName =
    extractField(text, "company\\s*name") ||
    extractField(text, "client\\s*name") ||
    extractField(text, "organisation") ||
    extractField(text, "company");

  const contactName =
    extractField(text, "contact\\s*name") ||
    extractField(text, "your\\s*name") ||
    extractField(text, "name");

  const contactEmail =
    extractField(text, "email") ||
    (text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] ?? "");

  const dateOfService =
    extractField(text, "date\\s*of\\s*service") ||
    extractField(text, "service\\s*date") ||
    extractField(text, "date\\s*of\\s*work");

  const overallSatisfaction =
    extractRating(text, "overall") ||
    extractRating(text, "satisfaction") ||
    extractRating(text, "general");

  const qualityOfWorkers =
    extractRating(text, "quality\\s*of\\s*work") ||
    extractRating(text, "workers") ||
    extractRating(text, "quality");

  const communication = extractRating(text, "communication");
  const compliance = extractRating(text, "compliance");
  const valueForMoney =
    extractRating(text, "value\\s*for\\s*money") ||
    extractRating(text, "value");

  const recommend = extractRecommend(text);

  const whatDidWell =
    extractTextBlock(text, "what\\s*did\\s*we\\s*do\\s*well") ||
    extractTextBlock(text, "strengths") ||
    extractTextBlock(text, "positives");

  const whatToImprove =
    extractTextBlock(text, "what\\s*(could|should|to)\\s*(we\\s*)?(improve|do\\s*better)") ||
    extractTextBlock(text, "improvements") ||
    extractTextBlock(text, "areas\\s*for\\s*improvement");

  const otherComments =
    extractTextBlock(text, "other\\s*comments") ||
    extractTextBlock(text, "additional\\s*comments") ||
    extractTextBlock(text, "comments");

  return {
    companyName,
    contactName,
    contactEmail,
    dateOfService,
    overallSatisfaction,
    qualityOfWorkers,
    communication,
    compliance,
    valueForMoney,
    recommend,
    whatDidWell,
    whatToImprove,
    otherComments,
    rawText: text.slice(0, 2000), // first 2000 chars for reference
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let rawText = "";

    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (name.endsWith(".pdf")) {
      return NextResponse.json({ error: "PDF import is not supported. Please save the document as .docx and try again." }, { status: 400 });
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .docx or .doc" }, { status: 400 });
    }

    const parsed = parseDocument(rawText);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Document import error:", err);
    return NextResponse.json({ error: "Failed to parse document" }, { status: 500 });
  }
}
