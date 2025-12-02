<template>
  <drag-handle :editor="editor" :tippy-options="tippyOpitons" class="umo-block-menu-drag-handle"
    :class="{ 'is-empty': editor.isEmpty }" @node-change="nodeChange">
    <div v-if="activationMode === 'click' ? showBlockMenuClick : true" class="umo-block-menu-hander"
      :class="`umo-selected-node-${selectedNode?.type?.name || 'unknown'} `">
      <menus-context-block-node @dropdown-visible="dropdownVisible" />
      <menus-context-block-common v-if="
        !editor.isEmpty ||
        editor.isActive('table') ||
        editor.isActive('callout')
      " :node="selectedNode" :pos="selectedNodePos" @dropdown-visible="dropdownVisible" />
      <t-dropdown v-if="showAiButton" placement="bottom-right" overlay-class-name="umo-ai-menu-dropdown" trigger="click"
        :destroy-on-close="false">
        <t-tooltip content="AI" placement="top">
          <t-button class="umo-ai-menu-button around-button aspect-square" variant="text" size="small">
            AI
          </t-button>
        </t-tooltip>
        <t-dropdown-menu>
          <t-dropdown-item @click="openAiModal">
            <menus-button ico="assistant" :text="t('assistant.editBlock')" :tooltip="false" />
          </t-dropdown-item>
          <t-dropdown-item @click="sendAiAddBlock">
            <menus-button ico="assistant" :text="t('assistant.addBlock')" :tooltip="false" />
          </t-dropdown-item>
          <t-dropdown-item @click="sendRiskBlock">
            <menus-button ico="assistant" :text="t('assistant.riskBlock')" :tooltip="false" />
          </t-dropdown-item>
          <t-dropdown-item @click="sendRiskDocument">
            <menus-button ico="assistant" :text="t('assistant.riskDocument')" :tooltip="false" />
          </t-dropdown-item>
          <t-dropdown-item @click="sendReplaceRequisites">
            <menus-button ico="assistant" :text="t('assistant.replaceRequisites')" :tooltip="false" />
          </t-dropdown-item>
        </t-dropdown-menu>
      </t-dropdown>
      <t-dialog v-model:visible="aiInlineVisible" header="Редактирование с помощью ИИ" :footer="false" width="480px"
        :attach="container" @close="onAiInlineCancel">
        <ai-tooltip v-model:instruction="aiInstruction" v-model:mode="applyModeLocal" :loading="aiIsLoading"
          :has-pending="!!aiPendingResult" :pending-result="aiPendingResult" @send="onAiInlineSend"
          @cancel="onAiInlineCancel" @accept="onAiInlineAccept" @reject="onAiInlineReject" />
      </t-dialog>
    </div>
  </drag-handle>
</template>

<script setup lang="ts">
import DragHandle from '@tiptap-pro/extension-drag-handle-vue-3'
import type { Instance } from 'tippy.js'
import type { Node } from '@tiptap/pm/model'

import { getSelectionHtml, getSelectionNode, getSelectionText } from '@/extensions/selection'
import AiTooltip from './ai-tooltip.vue'

const editor = inject('editor')
const options = inject('options')
const container = inject('container')
const assistant = inject('assistant')
const registerAiResultReady = inject<any>('onAiResultReady', null)
const unregisterAiResultReady = inject<any>('clearAiResultReady', null)

let selectedNode = $ref<any | null>(null)
let selectedNodePos = $ref<number | null>(null)

// Флаг для click-режима активации AI-кнопки у блока
let aiHandlePinned = $ref(false)

let aiInlineVisible = $ref(false)
let aiInstruction = $ref('')
let aiPendingResult = $ref<{ beforeText: string; afterText: string } | null>(null)
let aiIsLoading = $ref(false)
let applyModeLocal = $ref<'replace' | 'insert-after' | 'insert-below'>('replace')
let lastSelectionRange = $ref<{ from: number; to: number } | null>(null)

// Регистрируем callback для получения AI-результата из EditorUmo
if (typeof registerAiResultReady === 'function') {
  registerAiResultReady((result: { from: number; to: number; beforeText: string; afterText: string }) => {
    aiPendingResult = { beforeText: result.beforeText, afterText: result.afterText }
    lastSelectionRange = { from: result.from, to: result.to }
    aiIsLoading = false
  })
}

// Делаем hovered-блок доступным во вложенных меню (плюс-меню и т.п.)
provide('activeBlockNode', computed(() => selectedNode))
provide('activeBlockPos', computed(() => selectedNodePos))
// Открытие модального окна AI
const openAiModal = () => {
  aiInlineVisible = true
  aiPendingResult = null
  aiIsLoading = false
  aiInstruction = ''
  // Добавляем текущий блок к существующей множественной выборке (если есть)
  const onCommand = options.value.ai?.onCommand
  if (onCommand && editor.value && selectedNode) {
    const ed = editor.value
    const node: any = selectedNode
    const pos = selectedNodePos ?? ed.state.selection.from
    const { from: selFrom, to: selTo, empty } = ed.state.selection

    let text: string
    let from = selFrom
    let to = selTo

    if (!empty) {
      text = (getSelectionText(ed) ?? '').toString()
    } else {
      text = (node?.textContent ?? '').toString()
      const baseFrom = pos ?? ed.state.selection.from
      from = baseFrom
      to = node ? baseFrom + node.nodeSize : ed.state.selection.to
    }

    const clauseId = (node?.attrs?.clauseId as string | null) ?? null

    // Отправляем команду с типом 'edit', но без сброса существующей выборки
    onCommand({
      type: 'edit',
      text,
      clauseId: clauseId ?? undefined,
      range: { from, to },
      preserveSelection: true, // Новый флаг
    })
  }
}

// Даём plus-меню доступ к управлению тем же модальным окном
provide('openAiInlineTooltip', (initialInstruction?: string) => {
  if (typeof initialInstruction === 'string') {
    aiInstruction = initialInstruction
  }
  openAiModal()
})

// Открытие ассистента
const openAssistant = () => {
  if (assistant) {
    assistant.value = true
  }
  editor.value?.commands.selectParentNode()
  editor.value?.commands.focus()
  const { from, to } = editor.value?.state.selection ?? {}
  editor.value?.commands.setTextSelection({ from: from ?? 0, to: to ?? 0 })
}

// Добавление блока в AI-выборку
const sendAiAddBlock = async () => {
  const onCommand = options.value.ai?.onCommand
  if (!onCommand || !editor.value || !selectedNode) {
    return
  }

  const ed = editor.value
  const node: any = selectedNode
  const pos = selectedNodePos ?? ed.state.selection.from
  const { from: selFrom, to: selTo, empty } = ed.state.selection

  let text: string
  let from = selFrom
  let to = selTo

  if (!empty) {
    text = (getSelectionText(ed) ?? '').toString()
  } else {
    text = (node?.textContent ?? '').toString()
    const baseFrom = pos ?? ed.state.selection.from
    from = baseFrom
    to = node ? baseFrom + node.nodeSize : ed.state.selection.to
  }

  const clauseId = (node?.attrs?.clauseId as string | null) ?? null

  await onCommand({
    type: 'add-to-selection',
    text,
    clauseId: clauseId ?? undefined,
    range: { from, to },
  })
}

// Анализ рисков по текущему блоку
const sendRiskBlock = async () => {
  const onCommand = options.value.ai?.onCommand
  if (!onCommand || !editor.value || !selectedNode) {
    return
  }

  const ed = editor.value
  const node: any = selectedNode
  const pos = selectedNodePos ?? ed.state.selection.from

  const baseFrom = pos ?? ed.state.selection.from
  const from = baseFrom
  const to = node ? baseFrom + node.nodeSize : ed.state.selection.to

  const text = (node?.textContent ?? '').toString()
  const clauseId = (node?.attrs?.clauseId as string | null) ?? null

  await onCommand({
    type: 'risk-block',
    text,
    clauseId: clauseId ?? undefined,
    range: { from, to },
  })
}

// Анализ рисков по всему документу
const sendRiskDocument = async () => {
  const onCommand = options.value.ai?.onCommand
  const ed = editor.value
  if (!onCommand || !ed) {
    return
  }

  let text = ''
  let html: string | undefined
  try {
    text = typeof ed.getText === 'function' ? ed.getText() : ''
  } catch {
    text = ''
  }
  try {
    html = typeof ed.getHTML === 'function' ? ed.getHTML() : undefined
  } catch {
    html = undefined
  }

  await onCommand({
    type: 'risk-document',
    text,
    html,
  })
}

// Замена реквизитов в документе
const sendReplaceRequisites = async () => {
  const onCommand = options.value.ai?.onCommand
  const ed = editor.value
  if (!onCommand || !ed) {
    return
  }

  let text = ''
  try {
    text = typeof ed.getText === 'function' ? ed.getText() : ''
  } catch {
    text = ''
  }

  await onCommand({
    type: 'replace-requisites',
    text,
  })
}

const activationMode = computed(
  () => options.value.ai?.blockActivationMode ?? 'hover',
)

// При смене режима активации AI-кнопок (click/hover) сразу синхронизируем
// внутреннее состояние, чтобы режим "по наведению" начинал работать без
// перезагрузки страницы и без дополнительных selectionUpdate-событий.
watch(
  () => activationMode.value,
  (mode, prevMode) => {
    const ed = editor.value
    if (!ed) return
    if (mode === 'hover') {
      // Сбрасываем pin и выбранный блок, разблокируем drag-handle
      aiHandlePinned = false
      selectedNode = null
      selectedNodePos = null
      try {
        if ((ed as any).commands?.setMeta) {
          ;(ed as any).commands.setMeta('lockDragHandle', false as any)
        }
      } catch {
        // best-effort
      }
    }
  },
)

// Aggregated risk badges from host app (by clauseId)
const riskBadges = computed<Record<string, any>>(
  () => (options?.value?.ai?.risks ?? {}) as Record<string, any>,
)

const currentClauseId = computed<string | null>(() => {
  const node: any = selectedNode
  const id = node?.attrs?.clauseId
  return typeof id === 'string' && id.length > 0 ? id : null
})

const currentRiskBadge = computed<any | null>(() => {
  const id = currentClauseId.value
  if (!id) return null
  const badge = riskBadges.value[id] ?? null
  // eslint-disable-next-line no-console
  console.log('[umo][risk-icon] currentClauseId', id, 'badge', badge)
  return badge
})

const handleRiskIconClick = () => {
  const onCommand = options.value.ai?.onCommand
  if (!onCommand || !editor.value || !selectedNode || !currentRiskBadge.value) return

  const ed = editor.value
  const node: any = selectedNode
  const pos = selectedNodePos ?? ed.state.selection.from
  const from = pos
  const to = node ? pos + node.nodeSize : ed.state.selection.to
  const text = (node?.textContent ?? '').toString()

  void onCommand({
    type: 'risk-focus',
    text,
    clauseId: currentRiskBadge.value.clauseId ?? currentClauseId.value ?? undefined,
    range: { from, to },
    riskId: currentRiskBadge.value.primaryRiskId,
  })
}

let tippyInstance = $ref<Instance | null>(null)

// В click-режиме управляет видимостью панели bubble (плюсик, шесть точек, AI).
// В hover-режиме панель ведёт себя как раньше (ограничение по режиму не применяется).
const showBlockMenuClick = computed(() => {
  if (!editor?.value) return false
  if (!selectedNode) return false
  return aiHandlePinned
})

const tippyOpitons = $ref<Partial<Instance>>({
  zIndex: 20,
  popperOptions: {
    modifiers: [
      {
        name: 'eventListeners',
        options: { scroll: false, resize: false },
      },
    ],
  },
  onMount(instance: Instance) {
    tippyInstance = instance
  },
})

const showAiButton = computed(() => {
  if (!editor?.value || !options?.value) return false
  if (!options.value.ai?.onCommand) return false
  if (!selectedNode) return false
  // В hover-режиме показываем AI-кнопку при наведении на блок.
  if (activationMode.value === 'hover') return true
  // В click-режиме AI-кнопка показывается только после явного клика по панели блока.
  return aiHandlePinned
})

/**
 * Синхронизирует подсветку выбранного блока/текста в редакторе через ai-selection.
 */
const syncAiHighlights = () => {
  if (!editor?.value || !selectedNode) return
  const ed = editor.value
  const { from: selFrom, to: selTo, empty } = ed.state.selection
  const pos = selectedNodePos ?? ed.state.selection.from
  const range = empty
    ? { from: pos, to: (selectedNode ? pos + selectedNode.nodeSize : ed.state.selection.to) }
    : { from: selFrom, to: selTo }
  // Вызываем команду setAiSelections для подсветки
  if (ed.commands?.setAiSelections) {
    ed.commands.setAiSelections([range])
  }
}

/**
 * Применяет inline‑AI‑правку для текущего блока или выделения.
 * Использует hovered-блок DragHandle (selectedNode/selectedNodePos) и
 * текущее текстовое выделение, добавляя instruction из поля tooltip.
 */
const applyInlineAiEdit = async () => {
  const onCommand = options.value.ai?.onCommand
  if (!onCommand || !editor.value || !selectedNode) {
    aiInlineVisible = false
    aiInstruction = ''
    return
  }

  const ed = editor.value
  const node: any = selectedNode
  const pos = selectedNodePos ?? ed.state.selection.from
  const { from: selFrom, to: selTo, empty } = ed.state.selection

  let text: string
  let from = selFrom
  let to = selTo

  if (!empty) {
    // Если пользователь явно выделил фрагмент текста внутри блока,
    // отправляем в AI только этот фрагмент, чтобы "Выбранный фрагмент"
    // совпадал с визуальным выделением.
    text = (getSelectionText(ed) ?? '').toString()
  } else {
    // Если выделения нет — работаем на уровне всего блока (hovered‑блок).
    text = (node?.textContent ?? '').toString()
    const baseFrom = pos ?? ed.state.selection.from
    from = baseFrom
    to = node ? baseFrom + node.nodeSize : ed.state.selection.to
  }

  const clauseId = (node?.attrs?.clauseId as string | null) ?? null

  // Сохраняем диапазон для последующего применения результата
  lastSelectionRange = { from, to }

  await onCommand({
    type: 'edit',
    text,
    clauseId: clauseId ?? undefined,
    range: { from, to },
    instruction:
      aiInstruction && aiInstruction.trim().length > 0
        ? aiInstruction.trim()
        : undefined,
  })

  // НЕ закрываем tooltip, чтобы пользователь увидел результат
  // aiInlineVisible = false
  // aiInstruction = ''
}

const onAiInlineCancel = () => {
  // Явно закрываем tooltip через v-model
  aiInlineVisible = false
  aiInstruction = ''
  aiPendingResult = null
  aiIsLoading = false
  lastSelectionRange = null
  // Очищаем diff-подсветку
  if (editor.value?.commands?.clearAiDiff) {
    editor.value.commands.clearAiDiff()
  }
  // Убираем подсветку
  if (editor.value?.commands?.setAiSelections) {
    editor.value.commands.setAiSelections([])
  }
}

const onAiInlineSend = async () => {
  if (!aiInstruction.trim()) return
  aiIsLoading = true
  try {
    // Отправляем команду в EditorUmo для обработки AI
    await applyInlineAiEdit()
    // Закрываем модальное окно после отправки
    aiInlineVisible = false
    aiIsLoading = false
  } catch {
    aiIsLoading = false
  }
}

const onAiInlineAccept = () => {
  if (!aiPendingResult) return
  // Применяем AI-результат к редактору через insertContentAt
  const range = lastSelectionRange || (
    selectedNodePos !== null && selectedNode
      ? { from: selectedNodePos, to: selectedNodePos + selectedNode.nodeSize }
      : null
  )
  if (range && editor.value?.commands?.insertContentAt) {
    const mode = applyModeLocal
    const cleaned = aiPendingResult.afterText
    if (mode === 'replace') {
      editor.value.commands.insertContentAt({ from: range.from, to: range.to }, cleaned)
    } else if (mode === 'insert-after') {
      editor.value.commands.insertContentAt(range.to, ` ${cleaned}`)
    } else if (mode === 'insert-below') {
      editor.value.commands.insertContentAt(range.to, `\n${cleaned}\n`)
    }
  } else if (aiPendingResult.afterText && editor.value?.commands?.insertContent) {
    editor.value.commands.insertContent(aiPendingResult.afterText)
  }

  // Очищаем diff-подсветку
  if (editor.value?.commands?.clearAiDiff) {
    editor.value.commands.clearAiDiff()
  }

  // Закрываем tooltip
  aiInlineVisible = false
  aiInstruction = ''
  aiPendingResult = null
  aiIsLoading = false
  lastSelectionRange = null
  if (editor.value?.commands?.setAiSelections) {
    editor.value.commands.setAiSelections([])
  }
}

const onAiInlineReject = () => {
  // Очищаем diff и результат, но оставляем tooltip открытым для новой попытки
  aiPendingResult = null
  aiIsLoading = false
  // Очищаем diff-подсветку
  if (editor.value?.commands?.clearAiDiff) {
    editor.value.commands.clearAiDiff()
  }
  // Восстанавливаем обычную подсветку выделения
  syncAiHighlights()
}

// 菜单位置更新
const updateMenuPostion = useThrottleFn(() => {
  if (!tippyInstance) {
    return
  }
  try {
    const { state, view } = editor.value
    const topPos = state.selection.$from.before(1)
    const topDOM = view.nodeDOM(topPos)
    const rect = topDOM?.getBoundingClientRect()
    if (rect) {
      tippyInstance.setProps({
        getReferenceClientRect: () => rect,
      })
    }
  } catch { }
}, 200)

let editorClickCleanup: null | (() => void) = null

onMounted(() => {
  const handleSelectionUpdate = () => {
    // Всегда обновляем позицию bubble-меню
    updateMenuPostion()

    const ed = editor.value
    if (!ed) return

    // В hover-режиме дополнительно ничего не делаем, полагаемся на поведение DragHandle по hover.
    if (activationMode.value !== 'click') {
      // На всякий случай снимаем "замок" drag-handle, если выходим из click-режима.
      if (ed.commands?.setMeta) {
        ed.commands.setMeta('lockDragHandle', false as any)
      }
      return
    }

    // Диагностика: логируем selectionUpdate в click-режиме.
    try {
      const sel = ed.state.selection
      // eslint-disable-next-line no-console
      console.log('[UmoBlockMenu.selectionUpdate]', {
        aiHandlePinned,
        from: sel.from,
        to: sel.to,
        empty: sel.empty,
      })
    } catch {}

    // В click-режиме не хотим автоматически "прибивать" панель к последнему
    // блоку только из-за того, что ProseMirror поменял selection (например,
    // при первой инициализации документа). Это провоцирует автоскролл к
    // концу документа.
    //
    // Поэтому, пока блок явно не закреплён кликом (aiHandlePinned === false),
    // просто обновляем позицию bubble и выходим.
    if (!aiHandlePinned) {
      return
    }

    const { selection } = ed.state
    const $pos = selection.$from

    let depth = $pos.depth
    let node = $pos.node(depth)

    // Поднимаемся до ближайшего блочного узла (параграф, заголовок и т.п.)
    while (depth > 0 && !node.isBlock) {
      depth -= 1
      node = $pos.node(depth)
    }

    if (!node || !node.isBlock) {
      // Вышли из текста блока — сбрасываем pin и выбранный блок
      aiHandlePinned = false
      selectedNode = null
      selectedNodePos = null
      if (ed.commands?.setMeta) {
        ed.commands.setMeta('lockDragHandle', false as any)
      }
      return
    }

    const nodePos = $pos.before(depth)
    selectedNode = node
    selectedNodePos = nodePos

    // Лочим drag-handle на выбранном блоке, чтобы hover по другим блокам не уводил bubble.
    if (ed.commands?.setMeta) {
      ed.commands.setMeta('lockDragHandle', true as any)
    }

    syncAiHighlights()
  }

  editor.value.on('selectionUpdate', handleSelectionUpdate)

  // DOM-click по тексту блока: фиксируем выбранный блок и pin в обоих режимах.
  const ed = editor.value
  const view = ed?.view
  const dom = view?.dom as HTMLElement | undefined
  if (dom && view) {
    const handleEditorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      // Игнорируем клики по самим контролам DragHandle и AI-меню
      if (
        target.closest('.umo-block-menu-hander') ||
        target.closest('.umo-ai-menu-dropdown') ||
        target.closest('.umo-block-menu-dropdown')
      ) {
        return
      }

      try {
        const coords = { left: event.clientX, top: event.clientY }
        const pos = view.posAtCoords(coords)
        if (!pos) return

        // Диагностика: логируем клик по тексту в обоих режимах.
        // eslint-disable-next-line no-console
        console.log('[UmoBlockMenu.editorClick]', {
          activationMode: activationMode.value,
          clientX: event.clientX,
          clientY: event.clientY,
          pos: pos.pos,
        })

        const $pos = view.state.doc.resolve(pos.pos)
        let depth = $pos.depth
        let node = $pos.node(depth)

        // Поднимаемся до ближайшего блочного узла (параграф, заголовок и т.п.)
        while (depth > 0 && !node.isBlock) {
          depth -= 1
          node = $pos.node(depth)
        }

        if (!node || !node.isBlock) {
          // Клик вне блочного контента: сбрасываем pin и разблокируем drag-handle
          aiHandlePinned = false
          selectedNode = null
          selectedNodePos = null
          if (ed.commands?.setMeta) {
            ed.commands.setMeta('lockDragHandle', false as any)
          }
          return
        }

        const nodePos = $pos.before(depth)
        selectedNode = node
        selectedNodePos = nodePos
        aiHandlePinned = true

        // Лочим drag-handle на выбранном блоке, чтобы hover по другим блокам не уводил bubble в click-режиме.
        if (ed.commands?.setMeta) {
          ed.commands.setMeta('lockDragHandle', true as any)
        }

        syncAiHighlights()
      } catch {
        // fail-safe
      }
    }

    dom.addEventListener('click', handleEditorClick)
    editorClickCleanup = () => {
      dom.removeEventListener('click', handleEditorClick)
    }
  }
})

onBeforeUnmount(() => {
  if (editorClickCleanup) {
    editorClickCleanup()
  }
})

const nodeChange = ({ node, pos }: { node: Node | null; pos: number }) => {
  // В hover-режиме обновляем selectedNode/selectedNodePos как обычно.
  // В click-режиме НЕ сбрасываем aiHandlePinned при простом наведении —
  // сброс pin должен происходить только при явном клике по другому блоку (через selectionUpdate).
  if (activationMode.value === 'hover') {
    selectedNode = node ?? null
    if (pos !== null) {
      selectedNodePos = pos
    }
  }
  // В click-режиме сохраняем текущий выбранный блок и pin, пока не кликнем по другому блоку.
}

const dropdownVisible = (visible: boolean) => {
  editor.value.commands.setMeta('lockDragHandle', visible)
}
</script>

<style lang="less">
.umo-block-menu {
  .umo-menu-button {
    color: var(--umo-text-color-light) !important;
  }

  &-drag-handle.is-empty {
    .umo-block-menu-hander {
      margin-top: 2px;
    }
  }

  &-hander {
    position: absolute;
    display: flex;
    right: -10px;
    top: -5px;
    padding-right: 15px;

    @media print {
      display: none;
    }

    &.umo-selected-node {

      &-table,
      &-horizontalRule,
      &-ProseMirror-gapcursor {
        margin-top: 5px;
      }

      &-pageBreak {
        margin-top: -6px;
      }
    }

    .umo-menu-button {
      background-color: var(--umo-page-background);

      .umo-button-content {
        color: rgba(0, 0, 0, 0.5);
      }

      &:not(.active):hover {
        background-color: var(--umo-content-node-selected-background);
      }

      &.active {
        &:hover {
          opacity: 0.8;
        }

        .umo-button-content {
          color: var(--umo-text-color-light);
        }
      }
    }
  }

  &-dropdown {
    .umo-block-menu-group-name {
      padding-left: 15px !important;
    }

    .umo-dropdown__menu,
    .umo-dropdown__submenu {
      --td-radius-default: 0;
      padding: 8px 0 !important;

      .umo-divider {
        margin: 4px 0 2px;
        opacity: 0.5;
      }

      .umo-dropdown__item {
        padding: 2px 0;
        min-width: 140px !important;

        .umo-menu-button {
          background-color: transparent;
          padding: 0 15px;
          box-sizing: border-box;
          justify-content: flex-start;
          width: 100%;

          &-wrap {
            display: block !important;
          }

          .umo-button__text {
            width: 100%;
          }
        }

        .umo-button-content {
          width: 100%;
          justify-content: flex-start;

          .umo-button-text {
            color: var(--umo-text-color);
          }

          .umo-button-icon {
            margin-right: 3px;
            font-size: 16px;
            color: #666;
          }

          .umo-button-kbd {
            flex: 1;
            text-align: right;
            color: var(--umo-text-color-light);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9px;
          }

          .umo-heading {
            display: flex;
            color: var(--umo-text-color);

            .icon-heading {
              font-size: 12px;
              display: inline-block;
              width: 2em;
            }
          }
        }

        &--disabled {
          .umo-button-content {
            opacity: 0.6;
          }
        }

        &-direction {
          opacity: 0.4;
          font-size: 12px !important;
          margin-right: 8px;
        }

        .umo-dropdown-item-label {
          padding: 1px 15px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      }
    }

    .umo-delete-node {
      .umo-button {
        * {
          color: var(--umo-error-color) !important;
        }
      }
    }
  }
}

.ProseMirror-noderangeselection {
  *::selection {
    background: transparent;
  }

  * {
    caret-color: transparent;
  }
}

// Ограничиваем область, в которой DragHandle перехватывает события мыши:
//
// - сама обёртка drag-handle делает слой над блоком;
// - pointer-events: none на ней позволяет кликам по левому padding абзаца
//   проходить "сквозь" к тексту/родительскому контейнеру (нативное выделение);
// - pointer-events: auto возвращаем только для самой панели с иконками,
//   чтобы dnd блока по-прежнему работал через "шесть точек" и соседние кнопки.
.umo-block-menu-drag-handle {
  pointer-events: none;

  .umo-block-menu-hander,
  .umo-block-menu-hander * {
    pointer-events: auto;
  }
}

.around-button {
  border-radius: 0 50% 50%;
  border: none;

  &:focus {
    border: none;
  }
}

// Стили для AI-кнопки слева от блока
.umo-ai-menu-button.around-button {
  color: #fff;
  font-weight: 900;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg,
      #ff58c7,
      #915dff);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 6px 14px rgba(0, 0, 0, 0.25);

  .umo-ai-icon {
    display: block;
    color: #fff;
    fill: none;
    stroke: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -40%;
    width: 60%;
    height: 200%;
    background: linear-gradient(120deg,
        rgba(255, 255, 255, 0.1),
        rgba(255, 255, 255, 0.65),
        rgba(255, 255, 255, 0.1));
    transform: translateX(-120%) rotate(20deg);
    pointer-events: none;
    animation: umo-ai-button-shine 2.4s ease-in-out infinite;
  }

  &:hover {
    filter: brightness(1.05);
  }
}

@keyframes umo-ai-button-shine {
  0% {
    transform: translateX(-120%) rotate(20deg);
  }

  60% {
    transform: translateX(140%) rotate(20deg);
  }

  100% {
    transform: translateX(240%) rotate(20deg);
  }
}
</style>
