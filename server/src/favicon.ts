import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const FAVICONS_DIR = path.join(config.dataDir, 'favicons');

function ensureFaviconsDir() {
  if (!fs.existsSync(FAVICONS_DIR)) {
    fs.mkdirSync(FAVICONS_DIR, { recursive: true });
  }
}

export async function fetchAndSaveFavicon(url: string, monitorId: string): Promise<string | null> {
  console.log(`[favicon] Fetching for URL: ${url}, monitorId: ${monitorId}`);
  
  if (!url || typeof url !== 'string') return null;
  
  ensureFaviconsDir();
  
try {
      const parsed = new URL(url);
      const origin = parsed.origin;
      console.log(`[favicon] Parsed origin: ${origin}`);

    const candidates = [
      `${origin}/favicon.ico`,
      `${origin}/favicon.png`,
      `${origin}/apple-touch-icon.png`,
    ];

    try {
      console.log(`[favicon] Fetching HTML from: ${origin}`);
      const res = await fetch(origin, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; monitor/1.0)' },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });
      console.log(`[favicon] HTML fetch response status: ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        console.log(`[favicon] HTML fetched, length: ${html.length}`);
        const iconUrls = extractIconUrls(html, origin);
        console.log(`[favicon] Found icon URLs:`, iconUrls);
        candidates.unshift(...iconUrls);
      }
    } catch (e) {
      console.log(`[favicon] Failed to fetch HTML from ${origin}:`, (e as Error).message);
    }

    console.log(`[favicon] Checking ${candidates.length} candidates`);
    for (const candidateUrl of candidates) {
      console.log(`[favicon] Trying candidate: ${candidateUrl}`);
      try {
        const iconRes = await fetch(candidateUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; monitor/1.0)' },
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
        });

        console.log(`[favicon] Candidate ${candidateUrl} status: ${iconRes.status}, content-type: ${iconRes.headers.get('content-type')}`);
        
        if (!iconRes.ok) continue;

        const contentType = iconRes.headers.get('content-type') || '';
        if (!contentType.includes('image')) {
          console.log(`[favicon] Candidate ${candidateUrl} not an image`);
          continue;
        }

        const buffer = Buffer.from(await iconRes.arrayBuffer());
        console.log(`[favicon] Candidate ${candidateUrl} buffer length: ${buffer.length}`);
        if (buffer.length < 100) continue;

        let ext = 'png';
        if (contentType.includes('svg')) ext = 'svg';
        else if (contentType.includes('ico') || candidateUrl.endsWith('.ico')) ext = 'ico';
        else if (contentType.includes('gif')) ext = 'gif';

        const filename = `favicon_${monitorId}.${ext}`;
        const filepath = path.join(FAVICONS_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        
        console.log(`[favicon] Saved to: ${filepath}`);
        return `/favicons/${filename}`;
      } catch (e) {
        console.log(`[favicon] Candidate failed ${candidateUrl}:`, (e as Error).message);
        continue;
      }
    }

    return null;
  } catch (e) {
    console.log(`[favicon] Outer error:`, (e as Error).message);
    return null;
  }
}

function extractIconUrls(html: string, origin: string): string[] {
  const urls: string[] = [];
  const linkRegex = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const hrefMatch = match[0].match(/href=["']([^"']+)["']/);
    if (hrefMatch) {
      let href = hrefMatch[1];
      if (href.startsWith('//')) href = 'https:' + href;
      else if (href.startsWith('/')) href = origin + href;
      else if (!href.startsWith('http')) href = origin + '/' + href;
      urls.push(href);
    }
  }
  return [...new Set(urls)];
}

export function deleteFavicon(monitorId: string): void {
  ensureFaviconsDir();
  const files = fs.readdirSync(FAVICONS_DIR);
  for (const file of files) {
    if (file.startsWith(`favicon_${monitorId}.`)) {
      fs.unlinkSync(path.join(FAVICONS_DIR, file));
    }
  }
}