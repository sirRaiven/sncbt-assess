/**
 * Recovery callbacks are handled explicitly by the callback pages.
 *
 * Keeping this no-op plugin at the old path makes the Phase 2C hotfix safe to
 * copy over installations that already received the earlier recovery listener.
 */
export default defineNuxtPlugin(() => {});
