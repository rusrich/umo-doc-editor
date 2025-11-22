# Deal integration notes for `umo-doc-editor`

Этот документ описывает все изменения форка `umo-doc-editor`, которые сделаны специально
для интеграции с платформой Deal (юрредактор, AI‑правки, локализация ru/kk).

Документ считается *источником правды* по отличиям от апстрима и должен поддерживаться
актуальным при любых правках, связанных с Deal.

## 1. Новые локали и поведение i18n

### 1.1. Поддерживаемые локали

Форк расширяет список поддерживаемых локалей редактора:

- `en-US`
- `zh-CN`
- `ru-RU`
- `kk-KZ`

Связанные изменения:

- **Файл:** `src/i18n.ts`
  - Подключён словарь `./locales/ru-RU.json`.
  - Для `kk-KZ` временно используется тот же словарь, что и для `ru-RU` (алиас),
    чтобы интерфейс был полностью на русском до появления полноценного kk‑словари.
- **Файл:** `src/locales/ru-RU.json`
  - Добавлены/дополнены ключи, которые используются в интеграции Deal и ранее приводили к предупреждениям `vue-i18n`:
    - `bubbleMenu.tag.content` — подпись для редактирования тегов;
    - блок `about.*` (title, poweredBy, version, openSource, documentation, thanks) — секция "О редакторе";
    - блок `layout.*` (web, page) — переключатель режимов веб/страничный.

В TypeScript‑типах локалей изменения отражены в `types/index.d.ts`:

- `export type SupportedLocale = 'en-US' | 'zh-CN' | 'ru-RU' | 'kk-KZ'`.

### 1.2. Управление локалью извне

**Файл:** `src/components/index.vue`

- Метод `setLocale(params: SupportedLocale)` доступен через `defineExpose` и:
  - валидирует переданную локаль по списку `['zh-CN', 'en-US', 'ru-RU', 'kk-KZ']`;
  - записывает её в `localStorage` (`umo-editor:locale`);
  - выполняет `location.reload()`, чтобы перезапустить редактор в новой локали.
- Метод `getLocale()` возвращает текущую активную локаль.
- I18n‑инстанс (`i18n`) также проброшен наружу через `getI18n()`.

Во внешнем приложении (Deal) это позволяет:

- маппить язык рабочего пространства/пользователя на локаль Umo;
- управлять локалью редактора централизованно.

## 2. AI‑интеграция: контракт и точки входа

### 2.1. Контракт AI‑команд

**Файл:** `types/index.d.ts`

Для интеграции с AI‑панелью Deal введён унифицированный payload AI‑команды:

```ts
export interface AiCommandPayload {
  /** Тип действия: add-to-selection | edit | assistant-open | ... */
  type: string
  /** Текст выделенного фрагмента без разметки. */
  text: string
  /** HTML-фрагмент выделения (опционально). */
  html?: string
  /** Стабильный идентификатор блока (clauseId / data-clause-id), если есть. */
  clauseId?: string
  /** Диапазон selection в документе (позиции ProseMirror). */
  range?: { from: number; to: number }
}
```

Интерфейс опций редактора расширен полем `ai.onCommand`:

```ts
export interface UmoEditorOptions {
  // ...
  ai?: {
    assistant?: AssistantOptions
    /**
     * Внешний хук: любые AI-команды из UI Umo (bubble-меню, блок-меню, ассистент и т.п.).
     */
    onCommand?: (payload: AiCommandPayload) => void | Promise<void>
  }
  // ...
}
```

### 2.2. Генерация AI‑команд внутри Umo

Основные места, где Umo формирует и отправляет `AiCommandPayload` во внешнее приложение:

1. **Bubble‑меню ассистента** (окно AI над выделением)
   - **Файл:** `src/components/menus/bubble/assistant.vue`
   - При открытии ассистента и отправке запроса формируется payload с типом `assistant-open` или аналогичным,
     с заполненными полями `text`, `html`, `clauseId`, `range`.

2. **Контекстное меню блока (кнопки «плюс» и «шесть точек»)**
   - **Файлы:**
     - `src/components/menus/context/block/node.vue` — меню вставки блока (кнопка "плюс");
     - `src/components/menus/context/block/common.vue` — общее меню блока (кнопка "шесть точек").
   - В `node.vue` вынесены AI‑пункты меню:
     - "AI: Add block" → команда с `type: 'add-to-selection'`;
     - "AI: Edit block" → команда с `type: 'edit'`.

3. **Основная AI‑кнопка рядом с блок‑меню (drag‑handle)**
   - **Файл:** `src/components/menus/context/block/index.vue`
   - Отдельная кнопка с иконкой ассистента и градиентной подсветкой, отображается для абзацев и заголовков,
     сразу отправляет команду `type: 'edit'` с текущим выделением блока (аналогично пункту меню "AI: Edit block").

Во всех этих местах AI‑действия сходятся в единый хук `options.ai.onCommand`, который реализуется во внешнем приложении.

## 3. Поддержка clauseId и навигация по пунктам договора

Для связи с моделью документа Deal (пункты, риски, логи) форк поддерживает
стабильные идентификаторы блоков (`clauseId`).

### 3.1. Получение clauseId текущего блока

**Файл:** `src/components/index.vue`

Метод `getSelectionClauseId` проброшен наружу через `defineExpose` и задокументирован:

```ts
/**
 * Возвращает clauseId текущего абзаца или заголовка по текущему выделению.
 *
 * clauseId ожидается в attrs узла (например, установлен расширением нумерации пунктов договора).
 * Используется внешним приложением (Deal) для связи редактора с AI и списком рисков.
 *
 * @returns {string | null} Строковый идентификатор пункта или null, если он не задан.
 */
getSelectionClauseId: () => {
  if (!editor.value) {
    return null
  }
  const node = getSelectionNode(editor.value)
  const clauseId = node?.attrs?.clauseId
  return typeof clauseId === 'string' && clauseId.length > 0
    ? (clauseId as string)
    : null
},
```

Во внешнем коде (Deal) этот метод используется для сохранения `clauseId` вместе с AI‑командой
и дальнейшей привязки результата AI‑правки к конкретному пункту.

### 3.2. Навигация к пункту по clauseId

Там же, в `src/components/index.vue`, доступен метод `navigateToBlock`:

```ts
/**
 * Прокручивает документ и переносит фокус к абзацу/заголовку с указанным clauseId.
 *
 * Используется для навигации из внешнего UI (например, списка рисков или замечаний)
 * к соответствующему пункту договора в тексте редактора.
 *
 * @param {string} clauseId Стабильный идентификатор пункта (из attrs.clauseId).
 * @returns {boolean} true, если узел найден и фокус успешно установлен, иначе false.
 */
navigateToBlock(clauseId: string) {
  if (!editor.value || !clauseId) {
    return false
  }
  let targetPos: number | null = null
  editor.value.state.doc.descendants((node, pos) => {
    if (
      (node.type.name === 'paragraph' || node.type.name === 'heading') &&
      node.attrs?.clauseId === clauseId
    ) {
      targetPos = pos
      return false
    }
    return true
  })
  if (targetPos === null) {
    return false
  }
  editor.value
    .chain()
    .setTextSelection(targetPos)
    .focus('start', { scrollIntoView: true })
    .run()
  return true
},
```

Этот метод используется фронтендом Deal для перехода к пункту из списка рисков, истории
AI‑правок или любых других внешних панелей.

## 4. Поведение фокуса и скролла в контекстных меню

Чтобы избежать неожиданного скролла документа вверх/вниз при открытии контекстных меню,
внесены изменения в обработчики TDesign dropdown.

**Файлы:**

- `src/components/menus/context/block/node.vue`
- `src/components/menus/context/block/common.vue`

Ключевая идея: **не менять фокус редактора при открытии меню**, а лишь возвращать его
при закрытии. Упрощённый вид обработчика:

```ts
const popupProps = {
  attach: `${container} .umo-main-container`,
  onVisibleChange(visible: boolean) {
    // При открытии меню не трогаем фокус, чтобы не вызывать лишний скролл.
    // Возвращаем фокус только при закрытии.
    if (!visible) {
      editor.value?.commands.focus()
    }
    blockMenu.value = visible
    menuActive = visible
    emits('dropdownVisible', visible)
  },
}
```

Это изменение устраняет рывок прокрутки к старому выделению (часто в конце документа)
при первом клике на кнопки "плюс" и "шесть точек" после загрузки страницы.

## 5. Взаимодействие с фронтендом Deal

Ниже описаны ключевые точки стыковки форка с приложением Deal (репозиторий `deal`).

### 5.1. Обработчик AI-команд в Deal

**Файл (Deal):** `apps/web/src/views/EditorUmo.vue`

В самом приложении Deal реализован обработчик, который передаётся в Umo
через `editorOptions.ai.onCommand`:

```ts
/**
 * Централизованный обработчик всех AI-команд, приходящих из Umo Editor.
 *
 * Синхронизирует правую AI-панель с текущим контекстом:
 *  - сохраняет диапазон выделения (range) и clauseId последнего блока;
 *  - обновляет текст предпросмотра выбранного фрагмента;
 *  - накапливает текст при командах типа `add-to-selection`.
 *
 * Внешне Umo всегда вызывает этот обработчик через опцию ai.onCommand.
 *
 * @param payload Команда из Umo (тип действия, текст выделения, html?, clauseId?, range?).
 */
const handleAiCommand = async (payload: UmoAiCommandPayload) => {
  const { type, text, clauseId, range } = payload
  // ...
}
```

Этот обработчик:

- запоминает `range` и `clauseId` в локальном состоянии;
- обновляет правую панель (`selectedPreview`);
- логирует неизвестные типы команд для отладки.

### 5.2. Применение AI‑правок в Deal

**Файл (Deal):** `apps/web/src/views/EditorUmo.vue`

Основная бизнес‑логика применения результата AI:

```ts
/**
 * Применяет AI-правку к текущему выделенному фрагменту.
 *
 * Алгоритм:
 * 1) Пытается вызвать серверный aiEditDocument, который создаёт новую версию документа
 *    и логирует операцию на бэке; при успехе обновляет версию и URL.
 * 2) Если серверный путь падает, выполняет локальную правку через editClauseAI
 *    (ai-core), вставляет результат в редактор и пишет лог createAiEditLog.
 *
 * Также обновляет локальную историю AI-правок (aiHistory) и обнуляет черновик.
 * Ошибки показываются пользователю через snackbar и instructionError.
 */
async function applyAI() {
  // ...
}
```

Umo, со своей стороны, предоставляет только контекст (текст, html, clauseId, range) и
точку входа `ai.onCommand`. Вся бизнес‑логика (выбор провайдера AI, сохранение версий,
логирование) расположена в приложении Deal.

---

## 6. Как поддерживать этот документ

При любых изменениях, связанных с интеграцией Deal, обновляйте этот файл:

- добавляйте новые пункты в соответствующие разделы (локали, AI, clauseId, фокус/скролл);
- при удалении/переименовании методов (`getSelectionClauseId`, `navigateToBlock`,
  `ai.onCommand`) обязательно отражайте это здесь;
- при смене контракта AI‑команд обновляйте описание `AiCommandPayload`.

Это позволит в будущем безопасно подтягивать апстрим Umo и понимать, какие изменения
нужно сохранить или перенести заново.