import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { extname } from 'path';

export const PDF_UPLOAD_MAX_FILE_SIZE = 20 * 1024 * 1024;
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 60 * 5;

type UploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
};

type UploadFilterCallback = (error: Error | null, acceptFile: boolean) => void;

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
  signedUrlExpirySeconds: number;
};

const getSupabaseStorageConfig = (): SupabaseConfig => {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const signedUrlExpirySeconds = Number(
    process.env.SUPABASE_STORAGE_SIGNED_URL_EXPIRY_SECONDS ??
      DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
  );

  if (!url || !serviceRoleKey || !bucket) {
    throw new InternalServerErrorException(
      'Supabase Storage settings are incomplete on the server.',
    );
  }

  return {
    url: url.replace(/\/+$/, ''),
    serviceRoleKey,
    bucket,
    signedUrlExpirySeconds:
      Number.isFinite(signedUrlExpirySeconds) && signedUrlExpirySeconds > 0
        ? signedUrlExpirySeconds
        : DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
  };
};

const encodeStoragePath = (value: string) =>
  value
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const createStorageHeaders = (serviceRoleKey: string, contentType?: string) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
};

const buildStorageObjectPath = (
  folder: string,
  filePrefix: string,
  fileName: string,
) => {
  const extension = extname(fileName).toLowerCase() || '.pdf';
  const safeExtension = extension === '.pdf' ? extension : '.pdf';
  return `${folder}/${filePrefix}-${Date.now()}-${randomUUID()}${safeExtension}`;
};

const assertSuccessfulStorageResponse = async (
  response: Response,
  fallbackMessage: string,
) => {
  if (response.ok) {
    return;
  }

  const responseText = await response.text();

  throw new InternalServerErrorException(
    responseText.trim() || fallbackMessage,
  );
};

export const createPdfUploadOptions = (): MulterOptions => ({
  fileFilter: (
    _req: Request,
    file: Pick<UploadedFile, 'originalname' | 'mimetype'>,
    callback: UploadFilterCallback,
  ) => {
    const extension = extname(file.originalname).toLowerCase();
    const isPdf = file.mimetype === 'application/pdf' || extension === '.pdf';

    if (!isPdf) {
      callback(
        new BadRequestException('Only PDF files are allowed for uploading.'),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: PDF_UPLOAD_MAX_FILE_SIZE,
  },
});

export const uploadPdfToStorage = async (
  file: UploadedFile,
  folder: string,
  filePrefix: string,
) => {
  const config = getSupabaseStorageConfig();
  const objectPath = buildStorageObjectPath(
    folder,
    filePrefix,
    file.originalname,
  );
  const uploadUrl = `${config.url}/storage/v1/object/${config.bucket}/${encodeStoragePath(objectPath)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...createStorageHeaders(
        config.serviceRoleKey,
        file.mimetype || 'application/pdf',
      ),
      'x-upsert': 'false',
    },
    body: new Uint8Array(file.buffer),
  });

  await assertSuccessfulStorageResponse(
    response,
    'The file could not be uploaded to Supabase Storage.',
  );

  return objectPath;
};

export const deleteStoredUploadIfExists = async (
  storedPath: string | null | undefined,
) => {
  if (!storedPath?.trim()) {
    return;
  }

  const normalizedPath = storedPath.trim();

  if (
    normalizedPath.startsWith('http://') ||
    normalizedPath.startsWith('https://') ||
    normalizedPath.startsWith('data:') ||
    normalizedPath.startsWith('/uploads/')
  ) {
    return;
  }

  const config = getSupabaseStorageConfig();
  const deleteUrl = `${config.url}/storage/v1/object/${config.bucket}/${encodeStoragePath(normalizedPath)}`;

  try {
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: createStorageHeaders(config.serviceRoleKey),
    });
  } catch {
    // Cleanup failures should never block the main request flow.
  }
};

export const getStoredUploadAccessUrl = async (
  storedPath: string,
  requestOrigin: string,
) => {
  const normalizedPath = storedPath.trim();

  if (
    normalizedPath.startsWith('http://') ||
    normalizedPath.startsWith('https://') ||
    normalizedPath.startsWith('data:')
  ) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith('/uploads/')) {
    return new URL(normalizedPath, `${requestOrigin}/`).toString();
  }

  const config = getSupabaseStorageConfig();
  const signUrl = `${config.url}/storage/v1/object/sign/${config.bucket}/${encodeStoragePath(normalizedPath)}`;

  const response = await fetch(signUrl, {
    method: 'POST',
    headers: {
      ...createStorageHeaders(config.serviceRoleKey, 'application/json'),
    },
    body: JSON.stringify({
      expiresIn: config.signedUrlExpirySeconds,
    }),
  });

  await assertSuccessfulStorageResponse(
    response,
    'Unable to create a temporary link to the requested file.',
  );

  const payload = (await response.json()) as { signedURL?: string };

  if (!payload.signedURL) {
    throw new InternalServerErrorException(
      'Supabase did not return a valid temporary link to the file.',
    );
  }

  return `${config.url}/storage/v1${payload.signedURL}`;
};
