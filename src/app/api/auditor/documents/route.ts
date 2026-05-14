import { prisma } from "@/lib/db";
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

function getJwtSecret() {
  const secret = process.env.AUDITOR_JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("No JWT secret configured (AUDITOR_JWT_SECRET or AUTH_SECRET required)");
  return new TextEncoder().encode(secret);
}

async function verifyAuditorToken(request: NextRequest) {
  // Read from httpOnly cookie (not Authorization header)
  const token = request.cookies.get("auditor_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuditorToken(request);
    if (!payload) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.qmsDocument.findMany({
      orderBy: [{ folder: "asc" }, { subfolder: "asc" }, { fileName: "asc" }],
    });

    // Group documents by folder/subfolder
    const grouped: Record<
      string,
      {
        folder: string;
        subfolders: Record<
          string,
          {
            subfolder: string;
            documents: typeof documents;
          }
        >;
        documents: typeof documents;
      }
    > = {};

    for (const doc of documents) {
      if (!grouped[doc.folder]) {
        grouped[doc.folder] = {
          folder: doc.folder,
          subfolders: {},
          documents: [],
        };
      }

      if (doc.subfolder) {
        if (!grouped[doc.folder].subfolders[doc.subfolder]) {
          grouped[doc.folder].subfolders[doc.subfolder] = {
            subfolder: doc.subfolder,
            documents: [],
          };
        }
        grouped[doc.folder].subfolders[doc.subfolder].documents.push(doc);
      } else {
        grouped[doc.folder].documents.push(doc);
      }
    }

    // Convert to array structure
    const folderTree = Object.values(grouped).map((folder) => ({
      folder: folder.folder,
      documents: folder.documents,
      subfolders: Object.values(folder.subfolders),
    }));

    // Stats
    const totalDocuments = documents.length;
    const totalFolders = Object.keys(grouped).length;
    const lastUpdated = documents.reduce((latest, doc) => {
      return doc.updatedAt > latest ? doc.updatedAt : latest;
    }, new Date(0));

    return Response.json({
      folderTree,
      stats: {
        totalDocuments,
        totalFolders,
        lastUpdated: totalDocuments > 0 ? lastUpdated : null,
      },
    });
  } catch (error) {
    console.error("Auditor documents error:", error);
    return Response.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
