import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';

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
 * 1. Local Filesystem Provider (Development, Staging & Offline Mode Only)
 * NOTE: Render Free filesystem is EPHEMERAL and will be wiped on restart/redeploy.
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

    // If source is different from destination, copy
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
 * 2. Backblaze B2 Storage Provider (Native REST API, 10 GB Free Tier, No Credit Card Required)
 */
export class B2StorageProvider implements IDocumentStorageProvider {
  readonly providerName = 'b2';
  private keyId: string;
  private appKey: string;
  private bucket: string;
  private bucketId: string;

  // Cached authorization data
  private authData: {
    authorizationToken: string;
    apiUrl: string;
    downloadUrl: string;
    accountId: string;
    expiresAt: number;
  } | null = null;

  constructor() {
    this.keyId = (process.env.B2_APPLICATION_KEY_ID || process.env.B2_KEY_ID || '').trim();
    this.appKey = (process.env.B2_APPLICATION_KEY || '').trim();
    this.bucket = (process.env.B2_BUCKET_NAME || '').trim();
    this.bucketId = (process.env.B2_BUCKET_ID || '').trim();
  }

  isConfigured(): boolean {
    return Boolean(this.keyId && this.appKey && this.bucket);
  }

  /**
   * Authorizes account with Backblaze B2 Native API and caches session token (valid 24h)
   */
  private async authorize(): Promise<{
    authorizationToken: string;
    apiUrl: string;
    downloadUrl: string;
    accountId: string;
  }> {
    if (this.authData && Date.now() < this.authData.expiresAt) {
      return this.authData;
    }

    if (!this.isConfigured()) {
      throw new Error(
        'B2_CONFIG_ERROR: Backblaze B2 credentials (B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME) are not fully configured.'
      );
    }

    const credentials = Buffer.from(`${this.keyId}:${this.appKey}`).toString('base64');
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      throw new Error(`B2 Authorization failed with HTTP ${authRes.status}: ${errText}`);
    }

    const data: any = await authRes.json();
    this.authData = {
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
      accountId: data.accountId,
      expiresAt: Date.now() + 20 * 60 * 60 * 1000, // Cache for 20 hours
    };

    return this.authData;
  }

  /**
   * Resolves the B2 bucketId by bucket name if not explicitly provided
   */
  private async getBucketId(auth: { authorizationToken: string; apiUrl: string; accountId: string }): Promise<string> {
    if (this.bucketId) return this.bucketId;

    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: auth.accountId,
        bucketName: this.bucket,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`B2 list buckets failed with HTTP ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const found = (data.buckets || []).find((b: any) => b.bucketName === this.bucket);
    if (!found) {
      throw new Error(`B2 bucket "${this.bucket}" was not found in account.`);
    }

    this.bucketId = found.bucketId;
    return this.bucketId;
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

    const auth = await this.authorize();
    const bucketId = await this.getBucketId(auth);

    // Get upload URL from B2
    const uploadUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId }),
    });

    if (!uploadUrlRes.ok) {
      const errText = await uploadUrlRes.text();
      throw new Error(`B2 get_upload_url failed with HTTP ${uploadUrlRes.status}: ${errText}`);
    }

    const uploadUrlData: any = await uploadUrlRes.json();
    const fileBuffer = fs.readFileSync(params.filePath);
    const sha1Hash = crypto.createHash('sha1').update(fileBuffer).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    if (params.expectedSha256 && sha256Hash !== params.expectedSha256) {
      throw new Error(`Checksum mismatch prior to B2 upload: expected ${params.expectedSha256}, got ${sha256Hash}`);
    }

    // Upload file content to B2 uploadUrl
    const uploadRes = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadUrlData.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(params.key),
        'Content-Type': params.mimeType || 'application/octet-stream',
        'Content-Length': String(fileBuffer.length),
        'X-Bz-Content-Sha1': sha1Hash,
        'X-Bz-Info-sha256': sha256Hash,
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Backblaze B2 upload failed with HTTP ${uploadRes.status}: ${errText}`);
    }

    const uploadJson: any = await uploadRes.json();
    const storageUrl = `${auth.downloadUrl}/file/${this.bucket}/${encodeURIComponent(params.key)}`;

    return {
      key: params.key,
      sha256: sha256Hash,
      size: uploadJson.contentLength || fileBuffer.length,
      mimeType: params.mimeType,
      uploadedAt: new Date().toISOString(),
      storageProvider: 'b2',
      storageUrl,
    };
  }

  async getDownloadStream(key: string): Promise<NodeJS.ReadableStream> {
    const auth = await this.authorize();
    const url = `${auth.downloadUrl}/file/${this.bucket}/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      headers: { Authorization: auth.authorizationToken },
    });

    if (!res.ok || !res.body) {
      throw new Error(`B2 download failed for key "${key}" with HTTP ${res.status}`);
    }

    // @ts-ignore
    return Readable.fromWeb(res.body);
  }

  async getBuffer(key: string): Promise<Buffer> {
    const auth = await this.authorize();
    const url = `${auth.downloadUrl}/file/${this.bucket}/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      headers: { Authorization: auth.authorizationToken },
    });

    if (!res.ok) {
      throw new Error(`B2 fetch buffer failed for key "${key}" with HTTP ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const auth = await this.authorize();
      const bucketId = await this.getBucketId(auth);

      const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucketId,
          startFileName: key,
          maxFileCount: 1,
          prefix: key,
        }),
      });

      if (!res.ok) return false;
      const data: any = await res.json();
      return Array.isArray(data.files) && data.files.some((f: any) => f.fileName === key);
    } catch {
      return false;
    }
  }

  async deleteObject(key: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const auth = await this.authorize();
      const bucketId = await this.getBucketId(auth);

      // Find fileId
      const listRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucketId,
          startFileName: key,
          maxFileCount: 1,
          prefix: key,
        }),
      });

      if (!listRes.ok) return false;
      const listData: any = await listRes.json();
      const target = (listData.files || []).find((f: any) => f.fileName === key);
      if (!target) return true; // Already gone

      const delRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: key,
          fileId: target.fileId,
        }),
      });

      return delRes.ok;
    } catch {
      return false;
    }
  }

  getObjectUrl(key: string): string | undefined {
    if (!this.bucket) return undefined;
    return `https://${this.bucket}.s3.us-east-005.backblazeb2.com/${encodeURIComponent(key)}`;
  }
}

/**
 * 3. Central Document Storage Manager
 * Enforces production persistence constraints and routes to durable or local providers
 */
export class DocumentStorageService {
  private localProvider: LocalStorageProvider;
  private b2Provider: B2StorageProvider;

  constructor() {
    this.localProvider = new LocalStorageProvider();
    this.b2Provider = new B2StorageProvider();
  }

  /**
   * Returns true if a durable cloud storage provider (Backblaze B2) is configured
   */
  isDurableConfigured(): boolean {
    return this.b2Provider.isConfigured();
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

  getB2Provider(): B2StorageProvider {
    return this.b2Provider;
  }

  /**
   * Stores a file. In production, refuses ephemeral fallback to protect data durability.
   */
  async storeFile(params: {
    key: string;
    filePath: string;
    mimeType: string;
    expectedSha256?: string;
  }): Promise<StorageObjectMetadata> {
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, reject if durable cloud storage is not configured
    if (isProduction && !this.isDurableConfigured()) {
      throw new Error(
        'DURABLE_STORAGE_UNCONFIGURED: Binary document uploads are rejected in production because persistent storage (Backblaze B2) is not configured. Render free-tier local storage is ephemeral and will lose uploaded files on restart. Please set B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME in environment variables.'
      );
    }

    if (this.b2Provider.isConfigured()) {
      console.log(`[Storage Service] Storing object "${params.key}" to durable cloud provider [b2]`);
      // Upload to durable cloud storage
      return await this.b2Provider.uploadFile(params);
    }

    // In non-production (development, test), local storage is permitted
    console.log(`[Storage Service] Storing object "${params.key}" to local staging provider [local]`);
    return await this.localProvider.uploadFile(params);
  }

  async getStream(key: string, providerName?: string): Promise<NodeJS.ReadableStream> {
    if ((providerName === 'b2' || this.b2Provider.isConfigured()) && (await this.b2Provider.exists(key))) {
      return this.b2Provider.getDownloadStream(key);
    }
    return this.localProvider.getDownloadStream(key);
  }

  async getBuffer(key: string, providerName?: string): Promise<Buffer> {
    if ((providerName === 'b2' || this.b2Provider.isConfigured()) && (await this.b2Provider.exists(key))) {
      return this.b2Provider.getBuffer(key);
    }
    return this.localProvider.getBuffer(key);
  }

  async deleteObject(key: string): Promise<boolean> {
    let deleted = false;
    if (this.b2Provider.isConfigured()) {
      deleted = await this.b2Provider.deleteObject(key);
    }
    const localDeleted = await this.localProvider.deleteObject(key);
    return deleted || localDeleted;
  }

  async exists(key: string): Promise<boolean> {
    if (this.b2Provider.isConfigured()) {
      const b2Has = await this.b2Provider.exists(key);
      if (b2Has) return true;
    }
    return this.localProvider.exists(key);
  }
}

export const documentStorageService = new DocumentStorageService();
