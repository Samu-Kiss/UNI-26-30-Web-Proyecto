export const config = {
  api: {
    bodyParser: false,
  },
};

const DEFAULT_RENDER_BACKEND_URL = 'https://myt-lab-api.onrender.com';

const FORWARDED_REQ_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'x-myt-request',
  'x-xsrf-token',
];

const FORWARDED_RES_HEADERS = [
  'cache-control',
  'content-type',
  'expires',
  'location',
  'pragma',
  'vary',
];

export function resolveUpstreamBase(env = process.env) {
  const candidates = [env.RENDER_BACKEND_HOST, env.MYT_BACKEND_URL, DEFAULT_RENDER_BACKEND_URL];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed) continue;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withProtocol);
      const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname.toLowerCase());
      if (isLocal && (env.VERCEL === '1' || Boolean(env.VERCEL_ENV))) {
        continue;
      }
      return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
    } catch {
      // Ignorar URL malformada y probar siguiente candidato
    }
  }
  return DEFAULT_RENDER_BACKEND_URL;
}

export function buildUpstreamUrl(reqUrl = '/api/salud', upstreamBase = DEFAULT_RENDER_BACKEND_URL) {
  const base = upstreamBase.replace(/\/+$/, '');
  const parsed = new URL(reqUrl, 'http://localhost');
  let pathname = parsed.pathname;

  if (pathname === '/api/proxy' && parsed.searchParams.has('__myt_path')) {
    const rawValues = parsed.searchParams.getAll('__myt_path');
    const joined = rawValues
      .map((part) => (part || '').replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
    parsed.searchParams.delete('__myt_path');
    pathname = joined ? `/api/${joined}` : '/api';
  }

  const search = parsed.searchParams.toString();
  return `${base}${pathname}${search ? `?${search}` : ''}`;
}

async function readRequestBody(req) {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }

  if (typeof req[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    if (chunks.length > 0) {
      return Buffer.concat(chunks);
    }
  }

  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body) || req.body instanceof Uint8Array) {
      return req.body;
    }
    if (typeof req.body === 'string') {
      return req.body;
    }
    if (typeof req.body === 'object') {
      return JSON.stringify(req.body);
    }
  }

  return undefined;
}

const UPSTREAM_TIMEOUT_MS = 8500;

export default async function handler(req, res) {
  const upstreamBase = resolveUpstreamBase(process.env);
  const upstreamHost = new URL(upstreamBase).host;
  const upstreamUrl = buildUpstreamUrl(req.url || '/api', upstreamBase);
  const method = (req.method || 'GET').toUpperCase();

  res.setHeader('X-MYT-Upstream', upstreamHost);

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const headers = {};
  for (const name of FORWARDED_REQ_HEADERS) {
    const val = req.headers?.[name];
    if (Array.isArray(val)) {
      headers[name] = val.join('; ');
    } else if (typeof val === 'string' && val.length > 0) {
      headers[name] = val;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const body = await readRequestBody(req);
    const upstreamRes = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      redirect: 'manual',
      signal: controller.signal,
    });

    res.statusCode = upstreamRes.status;

    for (const name of FORWARDED_RES_HEADERS) {
      const val = upstreamRes.headers.get(name);
      if (val) {
        res.setHeader(name, val);
      }
    }

    const setCookies =
      typeof upstreamRes.headers.getSetCookie === 'function'
        ? upstreamRes.headers.getSetCookie()
        : upstreamRes.headers.get('set-cookie')
          ? [upstreamRes.headers.get('set-cookie')]
          : [];

    if (setCookies.length > 0) {
      res.setHeader('Set-Cookie', setCookies);
    }

    if (method === 'HEAD') {
      res.end();
      return;
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        mensaje:
          'El backend en Render está iniciando o no respondió a tiempo. Reintenta en unos segundos.',
      }),
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
