/**
 * Vercel Edge Function — 激活码验证
 * 固定激活码：BZQZ2026
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

  // 固定激活码 + 环境变量备用码（如需添加多个，逗号分隔填入 VALID_CODES）
  const FIXED_CODE = 'BZQZ2026';
  const backupCodes = (process.env.VALID_CODES || '')
    .split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

  const valid = code === FIXED_CODE || backupCodes.includes(code);
  return new Response(JSON.stringify({ valid }), { status: 200, headers: corsHeaders });
}
