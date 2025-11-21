import type { Extension, HTMLContent, JSONContent } from '@tiptap/core'
import type { FocusPosition } from '@tiptap/core'
import { Fragment, Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { App, DefineComponent } from 'vue'
export type SupportedLocale = 'en-US' | 'zh-CN' | 'ru-RU' | 'kk-KZ'
export type LayoutOption = 'web' | 'page'
export interface MarginOption {
  left: number
  right: number
  top: number
  bottom: number
}
export interface WatermarkOption {
  type?: string
  alpha?: number
  fontColor?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  text?: string
}
export interface PageOption {
  layouts: LayoutOption[]
  defaultMargin?: MarginOption
  defaultOrientation?: string
  defaultBackground?: string
  showBreakMarks?: boolean
  showBookmark?: boolean
  watermark?: WatermarkOption
  size?: {
    width: number
    height: number
    label?: LocaleLabel
  }
  margin?: {
    right: number
    left: number
    bottom: number
    top: number
    layout?: 'narrow' | 'moderate' | 'wide' | 'custom'
  }
  orientation?: string
  background?: string
  header?: boolean
  footer?: boolean
  showLineNumber?: boolean
  showToc?: boolean
  zoomLevel?: number
  bodyHeight?: number
  autoWidth?: boolean
  preview?: {
    enabled?: boolean
    laserPointer?: boolean
  }
}

export type ToolbarMenu =
  | 'base'
  | 'insert'
  | 'table'
  | 'tools'
  | 'page'
  | 'export'
  | 'advanced'
  | 'custom'

export interface ToolbarOptions {
  defaultMode?: 'classic' | 'ribbon'
  menus?: ToolbarMenu[]
}

export interface ImportWordOptions {
  enabled?: boolean
  maxSize?: number
  options?: unknown
  useCustomMethod?: boolean
  onCustomImportMethod?: (file: File) => Promise<{
    id: string
    url: string
    value: string
    messages: { type: string; message: string }
  }>
}

export interface AutoSaveOptions {
  enabled?: boolean
  interval?: number
}

export interface DocumentOptions {
  id?: string
  title?: string
  content?: string
  placeholder?: Record<string, string>
  enableSpellcheck?: boolean
  enableMarkdown?: boolean
  enableBubbleMenu?: boolean
  enableBlockMenu?: boolean
  readOnly?: boolean
  autofocus?: 'start' | 'end' | 'all' | number | boolean | null
  characterLimit?: number
  typographyRules?: Record<string, unknown>
  editorProps?: Record<string, unknown>
  parseOptions?: Record<string, unknown>
  showSave?: boolean
  autoSave?: AutoSaveOptions
}

export type LocaleLabel = string | { en_US: string; zh_CN: string }

export interface PageSize {
  label: LocaleLabel
  width: number
  height: number
  default?: boolean
}

export interface Font {
  label: LocaleLabel
  value: string | null
}

export interface LineHeight {
  label: LocaleLabel
  value: number
  default?: boolean
}

export interface GraphicSymbol {
  label: LocaleLabel
  items: string
}

export interface Emoji {
  label: LocaleLabel
  items: string
}

export interface Template {
  title: string
  content: string
  description?: string
  value?: string
  divider?: boolean
}

export interface AssistantOptions {
  enabled?: boolean
  maxlength?: number
  commands?: CommandItem[]
  onMessage?: (
    payload: AssistantPayload,
    content: AssistantContent,
  ) => Promise<ReadableStream | string>
}

export interface EchartsOptions {
  mode?: number
  renderImage?: boolean
  onCustomSettings?: CallableFunction
}

export interface UserItem {
  id: string
  label: string
  avatar?: string
}

export interface WebPageItem {
  label?: LocaleLabel
  icon?: string
  validate?(url: string): boolean
  transformURL?(url: string): string
}

export interface CommandItem {
  label?: LocaleLabel
  value?: LocaleLabel
  autoSend?: boolean
}

export interface AssistantPayload {
  lang?: string
  input?: string
  command?: string
  output?: string
}

export interface AssistantContent {
  html: HTMLContent
  json: JSONContent
  text: string
}
export interface AssistantResult {
  prompt?: string
  content?: string
  error?: boolean
  command?: string
}

/**
 * Унифицированный payload для AI-команд из Umo во внешнее приложение.
 */
export interface AiCommandPayload {
  /** Тип действия: add-to-selection | edit | risk | explain | ... */
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

export interface FileOptions {
  allowedMimeTypes?: string[]
  maxSize?: number
  preview?: {
    extensions?: string[]
    url?: string
  }[]
}

export type InsterContentType = string | Fragment | ProseMirrorNode

export interface SetContentOptions {
  emitUpdate: boolean
  focusPosition: FocusPosition
  focusOptions: { scrollIntoView: boolean }
}
export type InsterContentOptions = Omit<SetContentOptions, 'emitUpdate'> & {
  updateSelection: boolean
}

export type SetContentType = InsterContentType | JSONContent | JSONContent[]

type OnSaveFunction = (
  content: {
    html: HTMLContent
    json: JSONContent
    text: string
  },
  page: PageOption,
  document: DocumentOptions,
) => Promise<unknown>

type DeleteFileType = 'image' | 'video' | 'audio' | 'file' | 'inlineImage'

export interface UmoEditorOptions {
  editorKey?: string
  locale?: SupportedLocale
  theme?: 'light' | 'dark'
  height?: string
  fullscreenZIndex?: number
  dicts?: {
    pageSizes?: PageSize[]
    fonts?: Font[]
    colors?: string[]
    lineHeights?: LineHeight[]
    symbols?: GraphicSymbol[]
    emojis?: Emoji[]
  }
  toolbar?: ToolbarOptions
  page?: PageOption
  document?: DocumentOptions
  ai?: {
    /** Встроенный ассистент Umo (панель внизу). */
    assistant?: AssistantOptions
    /**
     * Хук для внешнего приложения: любые AI-команды из UI Umo
     * (bubble‑menu, блок‑меню, встроенный ассистент и т.п.).
     */
    onCommand?: (payload: AiCommandPayload) => void | Promise<void>
  }
  echarts?: EchartsOptions
  webPages?: WebPageItem[]
  templates?: Template[]
  cdnUrl?: string
  shareUrl?: string
  diagrams?: Record<string, unknown>
  importWord?: ImportWordOptions
  file?: FileOptions
  user?: Record<string, unknown>
  users?: UserItem[]
  extensions?: Extension[]
  disableExtensions?: string[]
  translations?: Record<string, unknown>
  onSave?: OnSaveFunction
  onFileUpload?: (file: File) => Promise<{ id: string; url: string }>
  onFileDelete?: (id: string, url: string, type?: DeleteFileType) => void
}

/**
 * Deal‑специфичный пресет настроек редактора.
 *
 * Основан на стандартных defaultOptions Umo и включает постраничный режим,
 * урезанный тулбар и отключённые экзотические инструменты.
 */
export declare const dealBaseOptions: Partial<UmoEditorOptions>

/**
 * Готовые настройки Deal‑редактора для использования "как есть".
 */
export declare const dealEditorOptions: UmoEditorOptions

/**
 * Фабрика для получения настроек Deal‑редактора с возможностью оверрайда.
 */
export declare function createDealEditorOptions(
  overrides?: Partial<UmoEditorOptions>,
): UmoEditorOptions

/**
 * Основной Vue‑компонент редактора Umo.
 */
export declare const UmoEditor: DefineComponent<
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

/**
 * Диалоговое окно Umo (модальные окна редактора).
 */
export declare const UmoDialog: DefineComponent<
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

/**
 * Кнопка для тулбаров/меню Umo.
 */
export declare const UmoMenuButton: DefineComponent<
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

/**
 * Тултип Umo, используемый во внутренних контролах.
 */
export declare const UmoTooltip: DefineComponent<
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

/**
 * Плагин для глобальной регистрации Umo Editor в приложении Vue.
 */
export declare const useUmoEditor: {
  install(app: App, options?: Partial<UmoEditorOptions>): void
}

export default UmoEditor
