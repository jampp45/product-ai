# Продакшн — деплой на Cloudflare

## Что это
Полноценный сервис: лендинг, регистрация/вход, база пользователей, баланс "искр" (по умолчанию 6 бесплатных при регистрации), генерация карточек товара через Gemini (Nano Banana). Ключ AI хранится только на сервере — в браузере пользователя его никогда нет.

## Шаг 1. Залить код на GitHub
1. Зайди на github.com → New repository → назови, например `product-ai`.
2. На странице репозитория нажми **Add file → Upload files**.
3. Перетащи ВСЮ папку `project` целиком (или все файлы и папку `functions` с её содержимым) — GitHub сохранит структуру папок.
4. Commit changes.

## Шаг 2. Подключить репозиторий к Cloudflare Pages
1. dash.cloudflare.com → **Workers & Pages** → **Create** → вкладка **Pages** → **Connect to Git**.
2. Авторизуй GitHub, выбери репозиторий `product-ai`.
3. Framework preset: **None**. Build command и output directory оставь пустыми (или output directory `/`).
4. Deploy.

## Шаг 3. Создать базу данных D1
1. В дашборде Cloudflare: **Storage & Databases → D1 → Create database**, назови `product-ai-db`.
2. Открой созданную базу → вкладка **Console** → вставь содержимое файла `schema.sql` из проекта → выполни.
3. Вернись в свой Pages-проект → **Settings → Functions → D1 database bindings → Add binding**:
   - Variable name: `DB`
   - D1 database: выбери `product-ai-db`
4. Сохрани.

## Шаг 4. Добавить секреты (переменные окружения)
В том же проекте: **Settings → Environment variables → Add variable** (тип — **Secret**, не обычная переменная):
- `GEMINI_API_KEY` — твой ключ с aistudio.google.com/app/apikey
- `SESSION_SECRET` — любая длинная случайная строка (например, сгенерируй на randomkeygen.com), нужна для подписи сессий пользователей

Добавь для окружения **Production** (и Preview, если хочешь тестировать превью-деплои).

## Шаг 5. Передеплоить
После добавления D1-биндинга и секретов нужен новый деплой, чтобы они применились:
**Deployments → на последнем деплое → Retry deployment** (или просто запушь любой мелкий коммит в GitHub).

## Готово
Сайт будет на `твой-проект.pages.dev`. Регистрация выдаёт 6 бесплатных искр, каждая генерация списывает одну.

## Что можно добавить дальше (не реализовано)
- Приём платежей за пополнение баланса (LiqPay/WayForPay/Stripe) — потребует ещё один endpoint и вебхук.
- Восстановление пароля по email — нужен email-сервис (например, Resend, у него есть бесплатный тариф).
- Реферальные бонусы, история генераций пользователя.
