import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

function generateDocRef(folder: string, subfolder: string | null, index: number): string {
  const folderMap: Record<string, string> = {
    "Context of Organisation": "CTX",
    "Quality Manual & Policy": "QMP",
    "Operational Processes": "OPS",
    "Core Procedures": "COR",
    "Master Document": "MDI",
    "Documents supplied": "SUP",
  };

  const prefix = folderMap[folder] || folder.substring(0, 3).toUpperCase();
  const sub = subfolder
    ? `-${subfolder.substring(0, 3).toUpperCase()}`
    : "";
  return `QMS-${prefix}${sub}-${String(index + 1).padStart(3, "0")}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await prisma.qmsDocument.findMany({
    orderBy: [{ folder: "asc" }, { subfolder: "asc" }, { fileName: "asc" }],
  });

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const headers = [
    "Doc Ref",
    "Document Title",
    "Version",
    "Folder",
    "Subfolder",
    "File Type",
    "File Size (bytes)",
    "Last Updated",
    "Uploaded By",
  ];

  const rows: string[][] = documents.map((doc, index) => [
    generateDocRef(doc.folder, doc.subfolder, index),
    doc.fileName,
    String(doc.version),
    doc.folder,
    doc.subfolder || "",
    doc.fileType,
    String(doc.fileSize),
    formatDate(doc.updatedAt),
    doc.uploadedBy || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\r\n");

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="document-index-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
