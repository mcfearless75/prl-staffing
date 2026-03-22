import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Create client lazily so env vars are read at runtime, not build time
let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        `R2 not configured. Missing: ${!accountId ? "R2_ACCOUNT_ID " : ""}${!accessKeyId ? "R2_ACCESS_KEY_ID " : ""}${!secretAccessKey ? "R2_SECRET_ACCESS_KEY" : ""}`
      );
    }

    _r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return _r2Client;
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME || "prl-documents";
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getFromR2(key: string): Promise<Buffer> {
  const client = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
  const stream = response.Body;
  if (!stream) throw new Error("No body in response");
  const chunks: Uint8Array[] = [];
  // @ts-expect-error - stream is readable
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
}
