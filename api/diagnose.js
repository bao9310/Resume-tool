/**
 * Vercel Edge Function — AI 诊断代理
 * 部署在 baoziqiuzhi.com/api/diagnose
 * 解决国内手机网络无法访问 workers.dev 的问题
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
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  const { system, user } = body;
  if (!system || !user) {
    return new Response(JSON.stringify({ error: 'Missing system or user field' }), { status: 400, headers: corsHeaders });
  }

  const apiKey = process.env.DEEPSEEK_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_KEY 未配置' }), { status: 500, headers: corsHeaders });
  }

  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 6000,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user },
        ],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || `DeepSeek 返回 ${resp.status}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    const content = data.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ content }), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
