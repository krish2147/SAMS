import crypto from "crypto";
import path from "path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

export function objectStorageEnabled(): boolean {
  return Boolean(
    process.env.SPACES_BUCKET &&
    process.env.SPACES_REGION &&
    process.env.SPACES_ACCESS_KEY_ID &&
    process.env.SPACES_SECRET_ACCESS_KEY
  );
}

function getClient(): S3Client {
  if (!objectStorageEnabled()) throw new Error("DigitalOcean Spaces is not configured.");
  if (!client) {
    const region = process.env.SPACES_REGION!;
    client = new S3Client({
      region,
      endpoint: process.env.SPACES_ENDPOINT || `https://${region}.digitaloceanspaces.com`,
      credentials: {
        accessKeyId: process.env.SPACES_ACCESS_KEY_ID!,
        secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY!
      }
    });
  }
  return client;
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await getClient().send(new PutObjectCommand({
    Bucket: process.env.SPACES_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "private, max-age=3600"
  }));
  return `/uploads/${key}`;
}

export async function getObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const result = await getClient().send(new GetObjectCommand({
      Bucket: process.env.SPACES_BUCKET!,
      Key: key
    }));
    if (!result.Body) return null;
    const bytes = await (result.Body as any).transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: result.ContentType || "application/octet-stream"
    };
  } catch (err: any) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

export async function persistUploadedFile(file: Express.Multer.File): Promise<string> {
  if (!objectStorageEnabled()) return `/uploads/${file.filename}`;
  const extension = path.extname(file.originalname).toLowerCase();
  const key = `members/${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extension}`;
  return await uploadObject(key, file.buffer, file.mimetype);
}
