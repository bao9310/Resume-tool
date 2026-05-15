/**
 * Vercel Edge Function — AI 诊断代理（流式传输版）
 * 解决 Hobby 计划 30s 超时问题：透传 DeepSeek SSE 流给前端
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { system, user } = body;
  if (!system || !user) {
    return new Response(JSON.stringify({ error: 'Missing system or user' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.DEEPSEEK_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_KEY 未配置' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // 调用 DeepSeek，开启流式输出
  const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 6000,
      temperature: 0,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
    }),
  });

  if (!upstream.ok) {
    let msg = `DeepSeek 返回 ${upstream.status}`;
    try { const e = await upstream.json(); msg = e.error?.message || msg; } catch {}
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // 直接透传流给前端
  // ⚠️ 不能用 text/event-stream：iOS Safari / WebKit 收到该 Content-Type 时
  //    fetch() 会与 EventSource 实现冲突，直接抛 "Load failed"
  //    改用 text/plain 前端照样可以按行解析 SSE 格式，行为完全一致
  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
