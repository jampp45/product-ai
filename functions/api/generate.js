import { getUserFromRequest } from '../_utils.js';

// fal.ai — Flux Kontext [pro]: image-to-image редактирование с сохранением исходного объекта.
const FAL_ENDPOINT = 'https://fal.run/fal-ai/flux-pro/kontext';

export async function onRequestPost({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Нужно войти в аккаунт.' }), { status: 401 });
  }
  if (user.credits <= 0) {
    return new Response(JSON.stringify({ error: 'Искры закончились. Пополни баланс.' }), { status: 402 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Некорректный запрос.' }), { status: 400 });
  }

  const { imageBase64, mimeType, conceptPrompt, extraPrompt } = body;
  if (!imageBase64 || !conceptPrompt) {
    return new Response(JSON.stringify({ error: 'Не хватает фото или стиля.' }), { status: 400 });
  }

  const promptText = 'Professional product photography. Re-render this exact product in the following style: '
    + conceptPrompt
    + (extraPrompt ? (' Additional instructions: ' + extraPrompt) : '')
    + ' Keep the product\'s exact shape, color, texture and proportions unchanged — do not distort or replace the product itself. Output a high-quality square marketplace product image.';

  const falBody = {
    prompt: promptText,
    image_url: `data:${mimeType};base64,${imageBase64}`
  };

  let resp, data;
  try {
    resp = await fetch(FAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${env.FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(falBody)
    });
    data = await resp.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Не удалось связаться с AI-моделью: ' + err.message }), { status: 502 });
  }

  if (!resp.ok) {
    const msg = (data && data.detail) ? JSON.stringify(data.detail) : (data && data.error) ? data.error : 'Неизвестная ошибка модели.';
    return new Response(JSON.stringify({ error: 'Ошибка от fal.ai: ' + msg }), { status: 502 });
  }

  const imageUrl = data?.images?.[0]?.url;
  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'Модель не вернула изображение.' }), { status: 502 });
  }

  // Списываем искру только после успешной генерации
  await env.DB.prepare('UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0').bind(user.id).run();

  return new Response(JSON.stringify({
    image: imageUrl,
    credits: user.credits - 1
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
