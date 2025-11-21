[English Changelog](https://dev.umodoc.com/en/docs/editor/changelog) | [中文更新日志](https://dev.umodoc.com/cn/docs/editor/changelog)

---

## Deal fork (local changes)

### 2025-11-21

- [locale] Added support for `ru-RU` and `kk-KZ` in `src/i18n.ts` and `src/locales/ru-RU.json`; `kk-KZ` temporarily maps to Russian messages.
- [locale] Completed Russian translation keys used by Deal integration:
  - added `bubbleMenu.tag.content`;
  - added `about.*` (title, poweredBy, version, openSource, documentation, thanks) and `layout.*` (web, page).
- [ai] Exposed AI command hook in options:
  - `UmoEditorOptions.ai.onCommand(payload)` with unified `AiCommandPayload` (type, text, html?, clauseId?, range?);
  - internal UI (assistant bubble menu and block context menu) now calls this hook for `assistant-open`, `add-to-selection` and `edit` commands.
- [ai] Relaxed validation for `ai.onCommand` in `src/options/index.ts` so non-function values only trigger `console.warn` instead of throwing.
- [ux] Adjusted block context menus focus behavior to avoid unwanted scrolling:
  - in `src/components/menus/context/block/node.vue` and `src/components/menus/context/block/common.vue` the `popupProps.onVisibleChange` handler keeps the current focus when menus open and restores `editor.commands.focus()` only when they close.
