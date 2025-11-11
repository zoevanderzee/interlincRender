
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Initialize S3 client (works for both AWS S3 and Cloudflare R2)
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT, // Required for R2
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.S3_BUCKET || 'interlinc-prod-files';
const STORAGE_PROVIDER = process.env.S3_ENDPOINT?.includes('r2.cloudflarestorage.com') ? 'r2' : 's3';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed'
];

// Max file size per plan (200MB default)
const MAX_FILE_SIZE = 200 * 1024 * 1024;

export interface FileMetadata {
  id: string;
  orgId: number | null;
  projectId: number | null;
  uploaderId: number;
  storageProvider: string;
  storageKey: string | null;
  legacyFilename: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'ready' | 'failed' | 'deleted';
  createdAt: Date;
}

/**
 * Validate file upload request
 */
export function validateFileUpload(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  if (!filename || filename.length === 0) {
    return { valid: false, error: 'Filename is required' };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `File type ${mimeType} not allowed. Supported types: images, PDF, text, Word documents, ZIP files` };
  }

  if (sizeBytes > MAX_FILE_SIZE) {
    return { valid: false, error: `File size ${sizeBytes} bytes exceeds maximum ${MAX_FILE_SIZE} bytes (200MB)` };
  }

  return { valid: true };
}

/**
 * Generate storage key for a file
 */
export function generateStorageKey(orgId: number | null, projectId: number | null, filename: string): string {
  const fileId = randomUUID();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  if (orgId && projectId) {
    return `org/${orgId}/project/${projectId}/${fileId}-${sanitizedFilename}`;
  } else if (orgId) {
    return `org/${orgId}/${fileId}-${sanitizedFilename}`;
  } else {
    return `uploads/${fileId}-${sanitizedFilename}`;
  }
}

/**
 * Generate presigned POST URL for direct browser upload
 */
export async function generatePresignedPost(
  storageKey: string,
  mimeType: string,
  sizeBytes: number
): Promise<{ url: string; fields: Record<string, string> }> {
  // For presigned POST, we use the PutObject command with presigned URL
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    ContentType: mimeType,
    ContentLength: sizeBytes
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 }); // 10 minutes

  // For simplicity with S3/R2, we return a PUT URL (not POST form)
  // The frontend will use fetch() with PUT method
  return {
    url: signedUrl,
    fields: {} // No form fields needed for PUT
  };
}

/**
 * Generate presigned GET URL for viewing/downloading
 */
export async function generatePresignedGet(storageKey: string, expiresIn: number = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey
  });

  return await getSignedUrl(s3Client, command, { expiresIn }); // Default 15 minutes
}

/**
 * Check if object exists in storage
 */
export async function checkObjectExists(storageKey: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey
    }));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Delete object from storage
 */
export async function deleteObject(storageKey: string): Promise<boolean> {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey
    }));
    return true;
  } catch (error) {
    console.error('Error deleting object:', error);
    return false;
  }
}

export { STORAGE_PROVIDER, BUCKET_NAME };
