import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export interface StorageObjectMetadata {
  key: string;
  sha256: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  storageProvider: 'b2' | 'github' | 'local';
  storageUrl?: string;
}

export interface IDocumentStorageProvider {
  readonly providerName: 'b2' | 'github' | 'local';
  isConfigured(): boolean;
  uploadFile(params: {
    key: string;
    filePath: string;
    mimeType: string;
    expectedSha256?: string;
  }): Promise<StorageObjectMetadata>;
  getDownloadStream(key: string): Promise<NodeJS.ReadableStream>;
  getBuffer(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  getObjectUrl(key: string): string | undefined;
}

/**
 * 1. Local Filesystem Provider (Default, Staging & Offline Fallback)
 */
export class LocalStorageProvider implements IDocumentStorageProvider {
  readonly providerName = 'local';
  private storageDir: string;

  constructor(customDir?: string) {
    this.storageDir = customDir || path.resolve(process.cwd(), 'curriculum-repo', 'uploads');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  isConfigured(): boolean {
    return true;
  }

  getStorageDir(): string {
    return this.storageDir;
  }

  async uploadFile(params: {
    key: string;
    filePath: string;
    mimeType: string;
    expectedSha256?: string;
  }): Promise<StorageObjectMetadata> {
    const destPath = path.join(this.storageDir, params.key);
    
    // If source is different from destination, copy or move
    if (path.resolve(params.filePath) !== path.resolve(destPath)) {
      fs.copyFileSync(params.filePath, destPath);
    }

    const stat = fs.statSync(destPath);

    // Calculate SHA-256 to verify integrity
    const hashSum = crypto.createHash('sha256');
    const fileStream = fs.createReadStream(destPath);
    for await (const chunk of fileStream) {
      hashSum.update(chunk);
    }
    const calculatedHash = hashSum.digest('hex');

    if (params.expectedSha256 && calculatedHash !== params.expectedSha256) {
      throw new Error(`Checksum mismatch during upload: expected ${params.expectedSha256}, got ${calculatedHash}`);
    }

    return {
      key: params.key,
      sha256: calculatedHash,
      size: stat.size,
      mimeType: params.mimeType,
      uploadedAt: new Date().toISOString(),
      storageProvider: 'local',
      storageUrl: `/api/materials/download/${encodeURIComponent(params.key)}`,
    };
  }

  async getDownloadStream(key: string): Promise<NodeJS.ReadableStream> {
    const filePath = path.join(this.storageDir, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Storage object not found: ${key}`);
    }
    return fs.createReadStream(filePath);
  }

  async getBuffer(key: string): Promise<Buffer> {
    const filePath = path.join(this.storageDir, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Storage object not found: ${key}`);
    }
    return fs.readFileSync(filePath);
  }

  async deleteObject(key: string): Promise<boolean> {
    const filePath = path.join(this.storageDir, key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(path.join(this.storageDir, key));
  }

  getObjectUrl(key: string): string | undefined {
    return `/api/materials/download/${encodeURIComponent(key)}`;
  }
}

/**
 * 2. Backblaze B2 Storage Provider (S3 Compatible API, 10 GB Free Forever)
 */
export class B2StorageProvider implements IDocumentStorageProvider {
  readonly providerName = 'b2';
  private keyId: string;
  private appKey: string;
  private bucket: string;
  private endpoint: string;

  constructor() {
    this.keyId = process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY_ID || '';
    this.appKey = process.env.B2_APPLICATION_KEY || '';
    this.bucket = process.env.B2_BUCKET_NAME || '';
    this.endpoint = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
  }

  isConfigured(): boolean {
    return Boolean(this.keyId && this.appKey && this.bucket);
  }

  async uploadFile(params: {
    key: string;
    filePath: string;
    mimeType: string;
    expectedSha256?: string;
  }): Promise<StorageObjectMetadata> {
    if (!this.isConfigured()) {
      throw new Error('Backblaze B2 is not configured with required environment credentials.');
    }

    const stat = fs.statSync(params.filePath);
    const hashSum = crypto.createHash('sha256');
    const fileStream = fs.createReadStream(params.filePath);
    for await (const chunk of fileStream) {
      hashSum.update(chunk);
    }
    const calculatedHash = hashSum.digest('hex');

    // Using B2 S3-Compatible REST Upload
    const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.appKey}`).toString('base64');
    const uploadUrl = `https://${this.bucket}.${this.endpoint}/${params.key}`;

    const stream = fs.createReadStream(params.filePath);
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': params.mimeType,
        'Content-Length': String(stat.size),
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      // @ts-ignore
      body: stream,
      duplex: 'half',
    });

    if (!res.ok) {
      throw new Error(`Backblaze B2 upload failed with HTTP ${res.status}: ${res.statusText}`);
    }

    return {
      key: params.key,
      sha256: calculatedHash,
      size: stat.size,
      mimeType: params.mimeType,
      uploadedAt: new Date().toISOString(),
      storageProvider: 'b2',
      storageUrl: uploadUrl,
    };
  }

  async getDownloadStream(key: string): Promise<NodeJS.ReadableStream> {
    const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.appKey}`).toString('base64');
    const url = `https://${this.bucket}.${this.endpoint}/${key}`;
    const res = await fetch(url, { headers: { Authorization: authHeader } });
    if (!res.ok || !res.body) {
      throw new Error(`B2 download failed with HTTP ${res.status}`);
    }
    // @ts-ignore
    return Readable.fromWeb(res.body);
  }

  async getBuffer(key: string): Promise<Buffer> {
    const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.appKey}`).toString('base64');
    const url = `https://${this.bucket}.${this.endpoint}/${key}`;
    const res = await fetch(url, { headers: { Authorization: authHeader } });
    if (!res.ok) throw new Error(`B2 fetch failed: HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  async deleteObject(key: string): Promise<boolean> {
    const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.appKey}`).toString('base64');
    const url = `https://${this.bucket}.${this.endpoint}/${key}`;
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: authHeader } });
    return res.ok;
  }

  async exists(key: string): Promise<boolean> {
    const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.appKey}`).toString('base64');
    const url = `https://${this.bucket}.${this.endpoint}/${key}`;
    const res = await fetch(url, { method: 'HEAD', headers: { Authorization: authHeader } });
    return res.status === 200;
  }

  getObjectUrl(key: string): string | undefined {
    return `https://${this.bucket}.${this.endpoint}/${key}`;
  }
}

/**
 * 3. Central Document Storage Manager
 * Automatically routes to the highest-priority configured provider
 */
export class DocumentStorageService {
  private localProvider: LocalStorageProvider;
  private b2Provider: B2StorageProvider;

  constructor() {
    this.localProvider = new LocalStorageProvider();
    this.b2Provider = new B2StorageProvider();
  }

  getActiveProvider(): IDocumentStorageProvider {
    if (this.b2Provider.isConfigured()) {
      return this.b2Provider;
    }
    return this.localProvider;
  }

  getLocalProvider(): LocalStorageProvider {
    return this.localProvider;
  }

  async storeFile(params: {
    key: string;
    filePath: string;
    mimeType: string;
    expectedSha256?: string;
  }): Promise<StorageObjectMetadata> {
    const provider = this.getActiveProvider();
    console.log(`[Storage Service] Storing object "${params.key}" using provider [${provider.providerName}]`);

    // Always ensure local copy exists as staging buffer
    const localMeta = await this.localProvider.uploadFile(params);

    if (provider.providerName !== 'local') {
      try {
        return await provider.uploadFile(params);
      } catch (err: any) {
        console.warn(`[Storage Service] Provider ${provider.providerName} upload notice, falling back to local:`, err?.message || err);
        return localMeta;
      }
    }

    return localMeta;
  }

  async getStream(key: string, providerName?: string): Promise<NodeJS.ReadableStream> {
    if (providerName === 'b2' && this.b2Provider.isConfigured()) {
      return this.b2Provider.getDownloadStream(key);
    }
    return this.localProvider.getDownloadStream(key);
  }

  async getBuffer(key: string, providerName?: string): Promise<Buffer> {
    if (providerName === 'b2' && this.b2Provider.isConfigured()) {
      return this.b2Provider.getBuffer(key);
    }
    return this.localProvider.getBuffer(key);
  }

  async deleteObject(key: string): Promise<boolean> {
    const active = this.getActiveProvider();
    const activeRes = await active.deleteObject(key);
    const localRes = await this.localProvider.deleteObject(key);
    return activeRes || localRes;
  }

  async exists(key: string): Promise<boolean> {
    const localExists = await this.localProvider.exists(key);
    if (localExists) return true;
    if (this.b2Provider.isConfigured()) {
      return this.b2Provider.exists(key);
    }
    return false;
  }
}

export const documentStorageService = new DocumentStorageService();
