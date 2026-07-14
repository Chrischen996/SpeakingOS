import { createHash, createHmac } from 'node:crypto';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured for audio processing`);
  return value;
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function signingKey(secret: string, date: string, region: string) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request');
}

export async function downloadAudio(storageKey: string) {
  const endpoint = required('S3_ENDPOINT').replace(/\/$/, '');
  const bucket = required('S3_BUCKET');
  const region = process.env.S3_REGION ?? 'us-east-1';
  const accessKeyId = required('S3_ACCESS_KEY_ID');
  const secretAccessKey = required('S3_SECRET_ACCESS_KEY');
  const url = new URL(`${endpoint}/${encodeURIComponent(bucket)}/${storageKey.split('/').map(encodeURIComponent).join('/')}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const date = amzDate.slice(0, 8);
  const payloadHash = createHash('sha256').update('').digest('hex');
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['GET', url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signature = hmac(signingKey(secretAccessKey, date, region), stringToSign).toString('hex');
  const response = await fetch(url, {
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  });
  if (!response.ok) throw new Error(`Audio download failed with ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
