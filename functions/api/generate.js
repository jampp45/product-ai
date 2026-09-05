import { getUserFromRequest } from '../_utils.js';

const MODEL = 'gemini-2.5-flash-image-preview';

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

  const promptText = 'Ты профессиональный товарный фотограф. Сгенерируй фотографию товара с этого изображения в следующем стиле: '
    + conceptPrompt
    + (extraPrompt ? (' Дополнительно: ' + extraPrompt) : '')
    + ' Важно: сохрани точную форму, цвет, текстуру и пропорции товара с исходного фото, не искажай сам товар. Формат — квадратное изображение высокого качества для карточки маркетплейса.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  const geminiBody = {
    contents: [{
      parts: [
        { text: promptText },
        { inline_data: { mime_type: mimeType, data: imageBase64 } }
      ]
    }]
  };

  let resp, data;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });
    data = await resp.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Не удалось связаться с AI-моделью: ' + err.message }), { status: 502 });
  }

  if (!resp.ok) {
    const msg = (data && data.error && data.error.message) ? data.error.message : 'Неизвестная ошибка модели.';
    return new Response(JSON.stringify({ error: 'Ошибка от Google: ' + msg }), { status: 502 });
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData || p.inline_data);

  if (!imagePart) {
    const textPart = parts.find(p => p.text);
    return new Response(JSON.stringify({ error: 'Модель не вернула изображение.' + (textPart ? (' Ответ: ' + textPart.text) : '') }), { status: 502 });
  }

  // Списываем искру только после успешной генерации
  await env.DB.prepare('UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0').bind(user.id).run();

  const inline = imagePart.inlineData || imagePart.inline_data;
  const mime = inline.mimeType || inline.mime_type || 'image/png';

  return new Response(JSON.stringify({
    image: `data:${mime};base64,${inline.data}`,
    credits: user.credits - 1
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
