import type { UmoEditorOptions } from '@/types'

import { defaultOptions, ojbectSchema } from '@/options'

/**
 * Базовый пресет настроек Umo Editor под юр‑редактор Deal.
 *
 * Не меняет глобальные defaultOptions самого Umo, а только задаёт
 * удобный стартовый набор опций: постраничный режим A4, минимальный тулбар
 * и отключение экзотических инструментов (диаграммы, QR‑коды, подписи и т.п.).
 */
export const dealBaseOptions: Partial<UmoEditorOptions> = {
  editorKey: 'deal',
  locale: 'ru-RU',
  theme: 'light',
  toolbar: {
    ...(defaultOptions.toolbar ?? {}),
    // Для юр‑редактора достаточно классического тулбара и ограниченного набора вкладок
    defaultMode: 'classic',
    menus: ['base', 'insert', 'table', 'page', 'export'],
  },
  page: {
    ...(defaultOptions.page ?? {}),
    // По умолчанию работаем в постраничном режиме (A4), web‑layout можно включить опционально
    layouts: ['page'],
    showBreakMarks: true,
    showBookmark: true,
    showLineNumber: false,
    showToc: true,
  },
  document: {
    ...(defaultOptions.document ?? {}),
    // Markdown‑режим и спеллчек Umo нам не нужны — у приложения свои механизмы
    enableMarkdown: false,
    enableSpellcheck: false,
    enableBubbleMenu: true,
    enableBlockMenu: true,
    autofocus: true,
    // Автосейв версий реализован на стороне приложения, поэтому локальный авто‑save снижем до no‑op
    autoSave: {
      enabled: false,
      interval: defaultOptions.document?.autoSave?.interval ?? 300000,
    },
  },
  /**
   * Отключаем редко используемые и неюридические инструменты.
   *
   * Значения используются одновременно для скрытия пунктов тулбара
   * (classic/ribbon) и для фильтрации расширений в getDefaultExtensions
   * там, где имена совпадают с Extension.name.
   */
  disableExtensions: [
    // Базовые "визуальные" фичи, которые не критичны для договоров
    'emoji',
    'symbol',
    'math',
    'chinese-date',
    // Вставка медиа и произвольных файлов (для договоров достаточно ссылок и таблиц)
    'audio',
    'video',
    'file',
    'web-page',
    // Формы/виджеты
    'option-box',
    'text-box',
    'columns',
    'tag',
    'callout',
    'mention',
    // Инструменты "Tools" вкладки
    'qrcode',
    'barcode',
    'signature',
    'seal',
    'diagrams',
    'echarts',
    'mermaid',
    'chinese-case',
    // Импорт из Word и markdown‑переключатель — у нас отдельный поток загрузки
    'import-word',
    'markdown',
  ],
}

/**
 * Готовый объект настроек для использования "как есть".
 *
 * Применяется, когда требуется единый преднастроенный профиль редактора
 * без дополнительного оверрайда на стороне приложения.
 */
export const dealEditorOptions: UmoEditorOptions = ojbectSchema.merge(
  defaultOptions,
  dealBaseOptions,
) as UmoEditorOptions

/**
 * Фабрика настроек Deal‑редактора.
 *
 * Позволяет сверху донастроить пресет (например, под язык/читалку воркспейса)
 * без ручного обращения к ObjectSchema.
 */
export const createDealEditorOptions = (
  overrides: Partial<UmoEditorOptions> = {},
): UmoEditorOptions => {
  return ojbectSchema.merge(
    defaultOptions,
    dealBaseOptions,
    overrides,
  ) as UmoEditorOptions
}
