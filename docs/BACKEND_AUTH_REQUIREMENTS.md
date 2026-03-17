# Документация - что нужно сделать на бекенде

## Цель и границы

Бекенд реализует единый слой аутентификации для мобильного приложения через OAuth провайдеров Apple и Google.

## Принцип

Мобильное приложение делает OAuth-логин и получает `id_token` (JWT) и, для Apple, `raw nonce`.

Бекенд не доверяет токену на слово и всегда верифицирует его подпись и claims.

После успешной проверки бекенд создает или находит пользователя, линкует провайдера и выдает сессию приложения.

## Скоуп в MVP

- `/v1/auth/oauth` - обмен внешнего `id_token` на сессию приложения
- `/v1/auth/refresh` - обновление `access token` по `refresh token`
- `/v1/auth/logout` - отзыв `refresh` токена (рекомендуется)
- `/v1/account` - удаление аккаунта (желательно для стор проверок и privacy)

## Важное требование

Если в приложении есть Google login, Sign in with Apple должен быть доступен.

## 1) API контракты

### 1.1 POST /v1/auth/oauth

#### Назначение

- Верифицировать `id_token` провайдера
- Создать или найти пользователя
- Создать или найти связку провайдера
- Выдать сессию приложения

#### Request JSON

- `provider`: `"apple" | "google"`
- `idToken`: `string`
- `nonce`: `string | null` (только для apple, raw nonce из приложения)
- `device`
- `deviceId`: `string` (стабильный uuid на инсталляцию)
- `platform`: `"ios" | "android"`
- `appVersion`: `string`
- `locale`: `string | null`

#### Response 200 JSON

- `accessToken`: `string`
- `refreshToken`: `string`
- `user`
- `id`: `string`
- `email`: `string | null`
- `name`: `string | null`
- `providers`: `Array<{ provider: "apple"|"google"; linkedAt: string }>`

#### Ошибки

- `400 invalid_request` - невалидный payload
- `401 invalid_token` - токен не прошел проверку
- `409 account_conflict` - конфликт линковки (если политика не позволяет автообъединение)
- `429 rate_limited`

#### Замечания

- Не логировать `idToken`, `refreshToken`, `nonce`.
- Желательно возвращать `requestId` для трассировки.

### 1.2 POST /v1/auth/refresh

#### Request JSON

- `refreshToken`: `string`
- `deviceId`: `string`

#### Response 200 JSON

- `accessToken`: `string`
- `refreshToken`: `string` (если включена ротация)

#### Ошибки

- `401 invalid_refresh`
- `403 token_revoked`

### 1.3 POST /v1/auth/logout

#### Request JSON

- `refreshToken`: `string`
- `deviceId`: `string`

#### Response

- `204`

### 1.4 DELETE /v1/account

#### Назначение

Удаление аккаунта по требованиям privacy.

#### Требования

- Доступ только по `accessToken`.
- Сначала revoke всех `refresh` токенов.
- Либо `hard delete` (если нет юридических ограничений), либо `soft delete` + анонимизация.

#### Response

- `204`

## 2) Верификация токенов

Общий список проверок для любого JWT:

- Проверка подписи по JWKS провайдера
- `iss` (issuer) допустимый
- `aud` (audience) совпадает с ожидаемым `client id`
- `exp` не истек
- `iat` разумный (опционально, защита от сильно старых токенов)
- `nonce` (для Apple)

Техническая реализация:

- Использовать стандартную JWT библиотеку с поддержкой JWKS, например `jose` (Node) или аналоги.
- JWKS кешировать с TTL и поддержкой ротации ключей.
- На ошибке проверки подписи пробовать обновить JWKS один раз и повторить.

### 2.1 Apple identityToken (JWT)

#### JWKS

- `https://appleid.apple.com/auth/keys`

#### Claims

- `iss` должен быть `https://appleid.apple.com`
- `aud` должен быть равен твоему `client id`, который ты используешь в приложении (в зависимости от настройки, часто `bundle id` или `services id`)
- `sub` - уникальный идентификатор пользователя у Apple
- `email` может прийти только при первом логине и может быть скрыт (Hide My Email)

#### Nonce

Приложение передает `raw nonce`.

В `id_token` claim `nonce` обычно лежит как `sha256(rawNonce)` в `base64url`.

Бекенд обязан пересчитать `sha256(rawNonce) -> base64url` и сравнить с claim `nonce`.

#### Проблемные кейсы

- При повторных логинах Apple может не прислать `email` и `fullName`. Сохранять при первом входе.
- Hide My Email дает приватный email-прокси. Его надо воспринимать как email пользователя для коммуникаций.

### 2.2 Google id_token (JWT)

#### JWKS

Google публикует ключи для OIDC, библиотека обычно сама подтянет их по discovery.

#### Issuer

- `https://accounts.google.com`
- `accounts.google.com`

#### Audience

Должен совпадать с Google OAuth Client ID, который соответствует твоему приложению.

#### Claims

- `sub` - идентификатор пользователя Google
- `email`, `email_verified`
- `name`, `picture` - опционально

## 3) Модель данных

Рекомендуемая схема.

### Table users

- `id` (uuid)
- `email` (nullable, unique частично - ниже)
- `name` (nullable)
- `status`: `active | disabled | deleted`
- `created_at`, `updated_at`
- `deleted_at` (nullable)

### Table user_providers

- `id` (uuid)
- `user_id` (fk users)
- `provider`: `apple | google`
- `provider_subject`: `string` (`sub`)
- `email_at_signup`: `string | null`
- `created_at`

#### Уникальные индексы

- `unique(provider, provider_subject)`
- `optional unique(email)` только если ты уверен, что email всегда есть и корректен. На практике лучше делать `unique(email) where email is not null`.

### Table refresh_tokens

- `id` (uuid)
- `user_id`
- `device_id`
- `token_hash`
- `created_at`
- `expires_at`
- `revoked_at` (nullable)
- `rotated_to_token_id` (nullable) если есть ротация

#### Почему refreshToken хранить хешем

Если базу утащат, чистые токены не утекут.

## 4) Алгоритм логина и линковки

Псевдологика `/v1/auth/oauth`:

1. Валидация request payload.
2. Verify idToken провайдера.
3. Извлечь `providerSubject = sub` и `email` (если есть).
4. Найти `user_providers` по `(provider, providerSubject)`.
5. Если найдено - user найден.
6. Если не найдено:
   - Если email присутствует:
     - Найти user по email.
     - Если найден - создать user_provider и залинковать к этому user.
     - Если не найден - создать user + user_provider.
   - Если email отсутствует:
     - Создать user без email + user_provider.
7. Выдать `accessToken` и `refreshToken`.

### Политика конфликтов

Конфликт обычно возникает, если email найден, но уже привязан к другому user и ты не хочешь автообъединение.

- MVP вариант - автообъединять по email, если `email_verified = true`.
- Более строгий вариант - вернуть `409` и попросить пользователя выполнить подтверждение внутри аккаунта.

### Дедупликация и идемпотентность

- Повторный запрос с тем же `provider+sub` должен приводить к одному и тому же user.
- Уникальный индекс `(provider, provider_subject)` защищает от гонок.

## 5) Сессия и токены приложения

### 5.1 Access token

- JWT
- TTL 10-30 минут

Claims:

- `sub: userId`
- `sid: session id` (опционально)
- `ver: token version` (опционально)
- `roles/scopes` (если нужно)

### 5.2 Refresh token

Вариант для продакшена:

- Opaque random string 32-64 bytes
- Хранить `hash(token)` в `refresh_tokens`
- TTL 30-90 дней
- Привязывать к `deviceId`

Ротация refresh token:

- При каждом refresh выдавать новый `refreshToken` и отзывать старый.
- Хранить `rotated_to_token_id`, чтобы обнаруживать reuse старого токена.

Logout:

- Делать revoke refresh токена по `deviceId`.

## 6) Безопасность и защита

Обязательное:

- HTTPS везде.
- Rate limit на `/v1/auth/oauth` и `/v1/auth/refresh`.
- Не логировать чувствительные поля.
- Валидация `issuer` и `audience`.
- Для Apple - строгая проверка nonce.

Рекомендуется:

- WAF или простой throttling на уровне gateway.
- Мониторинг аномалий: много ошибок `invalid_token`, всплески refresh.
- Блокировка пользователя `status=disabled`.
- Device binding refresh токена.
- Ведение audit логов без токенов, только `requestId`, `userId`, `provider`, результат.

Threat model кратко:

- Token substitution - решается проверкой `aud/iss/signature`.
- Replay - частично решается `exp` и `nonce` для Apple.
- Stolen refresh token - решается hash storage, rotation, device binding, revoke.

## 7) Конфигурация и секреты

ENV:

- `APPLE_AUDIENCE` - ожидаемое `aud`
- `GOOGLE_AUDIENCE` - ожидаемое `aud` (client id)
- `JWT_ACCESS_SECRET` или ключи для подписи JWT
- `REFRESH_TOKEN_TTL_DAYS`
- `ACCESS_TOKEN_TTL_MIN`

Хранение секретов:

- В secrets manager или переменных окружения в инфраструктуре.
- Никаких ключей в репозитории.

JWKS кеш:

- TTL 6-24 часа, но обновлять при ошибке подписи.
- Учитывать key rotation.

## 8) Набор тестов

Unit:

- `verifyAppleToken` - валидный, неверный issuer, неверный aud, истек exp
- `verifyAppleNonce` - правильный, неправильный
- `verifyGoogleToken` - неверный aud, истек exp
- `linkByProviderSubject` - повторный логин
- `linkByEmail` - первый логин, объединение

Integration:

- `/v1/auth/oauth` apple success
- `/v1/auth/oauth` apple wrong nonce -> 401
- `/v1/auth/oauth` google success
- `/v1/auth/refresh` success
- refresh token reuse после ротации -> 403

Load / abuse:

- rate limit работает

## 9) Observability

Логи:

- `requestId`
- `endpoint`
- `provider`
- `result: success | invalid_token | conflict | rate_limited`
- `latency`

Метрики:

- `auth_oauth_success_total{provider}`
- `auth_oauth_fail_total{provider,reason}`
- `auth_refresh_success_total`
- `auth_refresh_fail_total{reason}`
- `jwks_fetch_total{provider}`

Алерты:

- резкий рост `invalid_token`
- рост `5xx`
- рост `jwks_fetch` (возможная проблема кеша)

## 10) Чеклист для релиза

- Apple nonce верификация реализована и покрыта тестами.
- `aud/iss/exp` проверяются строго.
- JWKS кеш + обработка ротации ключей.
- Refresh token хранится хешем, есть revoke.
- Есть `DELETE /v1/account` или хотя бы понятный флоу удаления.
- Логи не содержат токенов.
- Rate limits включены.
