/**
 * Vercel Edge Function — lead notification proxy
 * Keeps Feishu webhook credentials on the server.
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: cors,
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: cors,
    });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing text' }), {
      status: 400,
      headers: cors,
    });
  }

  const hook = process.env.FEISHU_HOOK;
  if (!hook) {
    // Do not block diagnosis if notification is not configured.
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: cors,
    });
  }

  try {
    const upstream = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } }),
    });
    const data = await upstream.json().catch(() => ({}));
    const ok = upstream.ok && (data.code === 0 || data.StatusCode === 0);
    return new Response(JSON.stringify({ ok, feishu: data }), {
      status: ok ? 200 : 502,
      headers: cors,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 502,
      headers: cors,
    });
  }
}
