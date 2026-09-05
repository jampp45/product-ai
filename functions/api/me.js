import { getUserFromRequest } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Не авторизован.' }), { status: 401 });
  }
  return new Response(JSON.stringify({ email: user.email, credits: user.credits }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
