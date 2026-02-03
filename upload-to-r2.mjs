#!/usr/bin/env node

// upload-to-r2.mjs -- Honoka-CDN のファイルを Cloudflare R2 にアップロードする使い捨てスクリプト

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// --- 環境変数の検証 ---
const REQUIRED_ENV = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0 && process.env.DRY_RUN !== 'true') {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const DRY_RUN = process.env.DRY_RUN === 'true';
const CONCURRENCY = 10;

// --- パス定数 ---
const ROOT_DIR = join(fileURLToPath(import.meta.url), '..');
const CONTENT_DIR = join(ROOT_DIR, 'content');
const THEMES = ['honoka', 'umi', 'nico', 'rin'];
const RESOURCE_TYPES = ['css', 'js', 'fonts'];

// --- Content-Type マッピング ---
const CONTENT_TYPE_MAP = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

// --- S3 互換クライアント ---
const client = DRY_RUN
  ? null
  : new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

// --- ファイル収集 ---
async function discoverFiles() {
  const items = [];

  for (const theme of THEMES) {
    const themeDir = join(CONTENT_DIR, theme);
    let versions;
    try {
      versions = await readdir(themeDir, { withFileTypes: true });
    } catch {
      console.warn(`Theme directory not found: ${themeDir}`);
      continue;
    }

    for (const versionEntry of versions) {
      if (!versionEntry.isDirectory()) continue;
      const version = versionEntry.name;

      for (const resourceType of RESOURCE_TYPES) {
        const resourceDir = join(themeDir, version, 'dist', resourceType);
        let files;
        try {
          files = await readdir(resourceDir);
        } catch {
          // dist/fonts/ は v4 系では存在しないため無視
          continue;
        }

        for (const file of files) {
          const localPath = join(resourceDir, file);
          const fileStat = await stat(localPath);
          if (!fileStat.isFile()) continue;

          const r2Key = `${theme}/${version}/${resourceType}/${file}`;
          items.push({ localPath, r2Key });
        }
      }
    }
  }

  // index.html
  const indexPath = join(CONTENT_DIR, 'index.html');
  try {
    await stat(indexPath);
    items.push({ localPath: indexPath, r2Key: 'index.html' });
  } catch {
    console.warn('content/index.html not found, skipping');
  }

  return items;
}

// --- アップロード ---
async function uploadFile(item) {
  const body = await readFile(item.localPath);
  const ext = extname(item.localPath).toLowerCase();
  const contentType = CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
  const cacheControl = ext === '.html' ? 'public, max-age=3600' : 'public, max-age=2592000';

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: item.r2Key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}

async function uploadAll(items) {
  let index = 0;
  let completed = 0;
  let failed = 0;
  const errors = [];

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      try {
        await uploadFile(item);
        completed++;
        if (completed % 50 === 0) {
          console.log(`Progress: ${completed}/${items.length}`);
        }
      } catch (err) {
        failed++;
        errors.push({ key: item.r2Key, error: err.message });
        console.error(`FAILED: ${item.r2Key} -- ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return { completed, failed, errors };
}

// --- バケット内オブジェクト数の確認 ---
async function countObjects() {
  let count = 0;
  let continuationToken;
  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      }),
    );
    count += result.KeyCount || 0;
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return count;
}

// --- メイン ---
const items = await discoverFiles();
console.log(`Discovered ${items.length} files to upload`);

if (DRY_RUN) {
  for (const { r2Key } of items) {
    console.log(`  ${r2Key}`);
  }
  console.log(`\nTotal: ${items.length} files (dry run, no upload performed)`);
  process.exit(0);
}

const { completed, failed, errors } = await uploadAll(items);
console.log(`\nUpload complete: ${completed} succeeded, ${failed} failed`);

if (errors.length > 0) {
  console.log('\nFailed uploads:');
  for (const { key, error } of errors) {
    console.log(`  ${key}: ${error}`);
  }
}

const objectCount = await countObjects();
console.log(`\nR2 bucket now contains ${objectCount} objects`);

process.exit(failed > 0 ? 1 : 0);
