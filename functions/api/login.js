import { verifyPassword, createSessionToken, sessionCookieHeader } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Некорректный запрос.' }), { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, salt, credits FROM users WHERE email = ?'
  ).bind(email).first();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Неверный email или пароль.' }), { status: 401 });
  }

  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Неверный email или пароль.' }), { status: 401 });
  }

  const token = await createSessionToken(env, user.id);

  return new Response(JSON.stringify({ email: user.email, credits: user.credits }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookieHeader(token)
    }
  });
}
