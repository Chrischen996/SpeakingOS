import { createHash, createHmac } from 'node:crypto';

type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured for audio uploads`);
  return value;
}

function config(): S3Config {
  return {
    endpoint: required('S3_ENDPOINT').replace(/\/$/, ''),
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: required('S3_BUCKET'),
    accessKeyId: required('S3_ACCESS_KEY_ID'),
    secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
  };
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function signingKey(secret: string, date: string, region: string) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request');
}

/** Creates a short-lived SigV4 PUT URL without exposing storage credentials to the browser. */
export function createPresignedPutUrl(key: string, expiresInSeconds = 600) {
  const s3 = config();
  const url = new URL(`${s3.endpoint}/${encodeURIComponent(s3.bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${s3.region}/s3/aws4_request`;
  const credential = `${s3.accessKeyId}/${scope}`;
  url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  url.searchParams.set('X-Amz-Credential', credential);
  url.searchParams.set('X-Amz-Date', amzDate);
  url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
  url.searchParams.set('X-Amz-SignedHeaders', 'host');

  const canonicalQuery = [...url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&');
  const canonicalRequest = ['PUT', url.pathname, canonicalQuery, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  url.searchParams.set('X-Amz-Signature', hmac(signingKey(s3.secretAccessKey, date, s3.region), stringToSign).toString('hex'));
  return url.toString();
}
