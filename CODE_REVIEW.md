# Code Review: Security Hardening Changes

## Critical Issues

### 1. Saving monitoring config will wipe stored secrets

The `MonitoringConfig.toJSON()` now strips `telegramBotToken` and `proxyPassword` from API responses. However, `MonitoringConfigForm.tsx` was **not updated** — it still pre-fills form fields from the API response and sends all fields back on save. Since the token/password are now absent in the response, the form will send `undefined` for these fields, causing `Object.assign(config, dto)` to overwrite the stored values with `NULL` in the database.

The `sanitizeSensitiveFields` helper only deletes **empty strings** — it does not guard against `undefined`:

```ts
// monitoring.service.ts
if (
  typeof sanitized[field] === 'string' &&
  sanitized[field].trim() === ''
) {
  delete sanitized[field];
}
```

This means `{ telegramBotToken: undefined }` passes through and nullifies the column on save.

### 2. Frontend `MonitoringConfig` type not updated

`types/message-template.ts` still declares `telegramBotToken?: string` and `proxyPassword?: string`, but the backend now returns `hasTelegramBotToken: boolean` and `hasProxyPassword: boolean` instead. `TemplatePreviewModal.tsx` already uses `config?.hasTelegramBotToken` which **doesn't exist on the type** — this will be a TypeScript compilation error.

### 3. `TestTelegramConnectionDto` frontend type not updated

The frontend type at `types/message-template.ts` still requires `telegramBotToken: string` and `telegramChatId: string` as **mandatory**, but `TemplatePreviewModal` no longer sends `telegramBotToken`. This is a type error.

### 4. `MonitoringConfigForm` not adapted to stripped secrets

- `handleTestTelegram` validates `form.getFieldValue('telegramBotToken')`, which will always be empty since the API no longer returns it. The "Test Telegram Connection" button will be **permanently disabled**.
- On save, the form submits `telegramBotToken: undefined` and `proxyPassword: undefined`, triggering the wipe issue from #1.

## Minor Issues

### 5. `proxyPort` fallback uses `||` instead of `??`

In `monitoring.service.ts`, `dto.proxyPort || storedConfig?.proxyPort` treats `0` as falsy. While port 0 is unlikely, `??` is semantically correct for nullish-coalescing fallbacks.

### 6. `toJSON` leaks itself into the spread

`const { kubeconfig, ...safe } = this` — `safe` includes the `toJSON` function property. It's silently dropped during `JSON.stringify`, so no functional bug, but it's cleaner to also destructure `toJSON` out:

```ts
const { kubeconfig, toJSON, ...safe } = this;
```

### 7. `BadRequestException` caught by surrounding try/catch

In `testTelegramConnection`, the `throw new BadRequestException(...)` is caught by the enclosing `catch` block and converted to `{ success: false, message: error.message }`. The exception never surfaces as a 400 HTTP response. This works but is semantically misleading — a plain `Error` would be clearer.
