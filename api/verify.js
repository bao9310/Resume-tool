/**
 * Vercel Edge Function — 激活码验证
 * 部署在 baoziqiuzhi.com/api/verify
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers: corsHeaders });
  }

  const code = (body.code || '').trim().toUpperCase();
  if (!code) {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers: corsHeaders });
  }

  const todayCode = getDailyCode(process.env.CODE_SECRET, 0);
  const yestCode  = getDailyCode(process.env.CODE_SECRET, -1);
  const backupCodes = (process.env.VALID_CODES || '')
    .split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

  const valid = code === todayCode || code === yestCode || backupCodes.includes(code);
  return new Response(JSON.stringify({ valid }), { status: 200, headers: corsHeaders });
}

/**
 * 每日自动换码（与 Cloudflare Worker 保持完全一致）
 */
function getDailyCode(secret, offsetDays = 0) {
  const bj = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  bj.setDate(bj.getDate() + (offsetDays || 0));
  const ds = `${bj.getFullYear()}${String(bj.getMonth() + 1).padStart(2,'0')}${String(bj.getDate()).padStart(2,'0')}`;
  const raw = ds + (secret || 'BAOZI_DEFAULT_SECRET');
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(h, 33) ^ raw.charCodeAt(i)) >>> 0;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  let n = h;
  for (let i = 0; i < 4; i++) {
    suffix += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return `BZQZ${suffix}`;
}
