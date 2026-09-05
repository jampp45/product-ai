import { hashPassword, createSessionToken, sessionCookieHeader } from '../_utils.js';

const FREE_CREDITS = 6;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Некорректный запрос.' }), { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Введи корректный email.' }), { status: 400 });
  }
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: 'Пароль должен быть не короче 6 символов.' }), { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return new Response(JSON.stringify({ error: 'Аккаунт с таким email уже существует.' }), { status: 409 });
  }

  const { hash, salt } = await hashPassword(password);

  const result = await env.DB.prepare(
    'INSERT INTO users (email, password_hash, salt, credits) VALUES (?, ?, ?, ?)'
  ).bind(email, hash, salt, FREE_CREDITS).run();

  const userId = result.meta.last_row_id;
  const token = await createSessionToken(env, userId);

  return new Response(JSON.stringify({ email, credits: FREE_CREDITS }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookieHeader(token)
    }
  });
}
