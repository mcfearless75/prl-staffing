"use server";

import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function uploadQmsDocument(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string;
    const subfolder = (formData.get("subfolder") as string) || null;

    if (!file || !folder) {
      throw new Error("File and folder are required");
    }

    const fileName = file.name;
    const fileType = fileName.split(".").pop()?.toLowerCase() || "unknown";
    const fileSize = file.size;

    // Build the display path
    const filePath = subfolder ? `${folder}/${subfolder}` : folder;

    // Generate R2 key
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const r2Key = `qms-documents/${folder}/${subfolder ? subfolder + "/" : ""}${timestamp}-${safeFileName}`;

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      doc: "application/msword",
      xls: "application/vnd.ms-excel",
      ppt: "application/vnd.ms-powerpoint",
    };
    const contentType = mimeTypes[fileType] || "application/octet-stream";

    await uploadToR2(r2Key, buffer, contentType);

    // Save to database
    await prisma.qmsDocument.create({
      data: {
        fileName,
        filePath,
        folder,
        subfolder,
        fileType,
        fileSize,
        r2Key,
        uploadedBy: session.user.email || "staff",
        version: 1,
      },
    });

    revalidatePath("/qms/documents");
    return { success: true };
  } catch (error) {
    console.error("Failed to upload QMS document:", error);
    throw new Error("Failed to upload document. Please try again.");
  }
}

export async function deleteQmsDocument(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const doc = await prisma.qmsDocument.findUnique({ where: { id } });
    if (!doc) throw new Error("Document not found");

    // Delete from R2 if key exists
    if (doc.r2Key) {
      const { deleteFromR2 } = await import("@/lib/r2");
      await deleteFromR2(doc.r2Key);
    }

    await prisma.qmsDocument.delete({ where: { id } });

    revalidatePath("/qms/documents");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete QMS document:", error);
    throw new Error("Failed to delete document. Please try again.");
  }
}
