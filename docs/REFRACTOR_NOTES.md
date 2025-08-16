# Refactor Notes

The UI is being migrated to the new primitive-based framework.  Early groundwork
includes:

- Added minimal framework modules under `static/ui` providing `spawnWindow`,
  `createForm`, `createItemList`, `openModal`, async helpers and basic styling.
- Rebuilt the LLM settings windows on top of these primitives with proper forms,
  lists and modal dialogs.
- Introduced a real `showToast` helper and removed legacy `alert()` calls.

Further work is required to migrate the remaining feature windows.
