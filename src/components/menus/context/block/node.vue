<template>
  <t-dropdown placement="bottom-right" overlay-class-name="umo-block-menu-dropdown" :max-height="320" trigger="click"
    :destroy-on-close="false" :popup-props="popupProps">
    <menus-button class="umo-block-menu-button" :menu-active="menuActive" ico="block-add" hide-text />
    <t-dropdown-menu>
      <t-dropdown-item
        v-if="
          options.ai?.assistant?.enabled &&
          editor?.state?.selection?.$from?.nodeAfter
        "
        divider
      >
        <menus-button ico="assistant" :text="t('assistant.text')" :tooltip="false" @menu-click="openAssistant" />
      </t-dropdown-item>
      <t-dropdown-item v-if="options.ai?.onCommand">
        <menus-button ico="assistant" :text="t('assistant.addBlock')" :tooltip="false" @menu-click="sendAiAddBlock" />
      </t-dropdown-item>
      <t-dropdown-item v-if="options.ai?.onCommand">
        <menus-button
          class="umo-ai-menu-button"
          ico="assistant"
          :text="t('assistant.editBlock')"
          :tooltip="false"
          @menu-click="onAiMenuClick"
        />
      </t-dropdown-item>
      <t-dropdown-item class="umo-block-menu-group-name" disabled>
        {{ t('blockMenu.insert') }}
      </t-dropdown-item>
      <t-dropdown-item>
        <menus-button ico="table" :text="t('table.insert.text')" :tooltip="false"
          @menu-click="editor?.chain().focus().insertTable().run()" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('image')">
        <menus-toolbar-insert-image :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('video')">
        <menus-toolbar-insert-video :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('audio')">
        <menus-toolbar-insert-audio :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('file')">
        <menus-toolbar-insert-file :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('code-block')">
        <menus-toolbar-insert-code-block :huge="false" shortcut-text="Ctrl+Alt+C" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('callout')">
        <menus-toolbar-insert-callout :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('hr')">
        <menus-button ico="hr" :text="t('insert.hr.text')" :tooltip="false"
          @menu-click="editor?.chain().focus().setHr({ type: 'signle' }).run()" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('toc')">
        <menus-toolbar-insert-toc :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('text-box')">
        <menus-toolbar-insert-text-box :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('web-page')">
        <menus-toolbar-insert-web-page :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('qrcode')">
        <menus-toolbar-tools-qrcode :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('barcode')">
        <menus-toolbar-tools-barcode :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('signature')">
        <menus-toolbar-tools-signature :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('seal')">
        <menus-toolbar-tools-seal :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('diagrams')">
        <menus-toolbar-tools-diagrams :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('echarts')">
        <menus-toolbar-tools-echarts :huge="false" :tooltip="false" mode="add" />
      </t-dropdown-item>
      <t-dropdown-item v-if="!disableMenu('mermaid')">
        <menus-toolbar-tools-mermaid :huge="false" :tooltip="false" />
      </t-dropdown-item>
      <t-dropdown-item v-if="options.templates.length > 0">
        <menus-button ico="template" :text="t('blockMenu.template')" :tooltip="false" />
        <t-dropdown-menu overlay-class-name="umo-block-menu-dropdown" placement="right">
          <t-dropdown-item v-for="item in options.templates" :key="item.value" :value="item.value"
            :divider="item.divider" @click="setTemplate(item)">
            <div class="umo-dropdown-item-label">{{ item.title }}</div>
          </t-dropdown-item>
        </t-dropdown-menu>
      </t-dropdown-item>
    </t-dropdown-menu>
  </t-dropdown>
</template>

<script setup lang="ts">
import type { Template } from '@/types'
import { getSelectionNode, getSelectionText } from '@/extensions/selection'

const emits = defineEmits<{
  dropdownVisible: (visible: boolean) => void
}>()

const container = inject('container')
const editor = inject('editor')
const blockMenu = inject('blockMenu')
const assistant = inject('assistant')
const options = inject('options')
// Hovered-блок, проброшенный из DragHandle (block/index.vue)
const activeBlockNode = inject('activeBlockNode') as any
const activeBlockPos = inject('activeBlockPos') as any
// Управление общим inline-tooltip, размещённым на главной AI-кнопке в block/index.vue
const openAiInlineTooltip = inject<((initialInstruction?: string) => void) | null>('openAiInlineTooltip', null)

let menuActive = $ref(false)
const popupProps = {
  attach: `${container} .umo-main-container`,
  onVisibleChange(visible: boolean) {
    // Не трогаем фокус редактора при открытии/закрытии меню, чтобы
    // избежать автоскролла (особенно при сценариях AI).
    blockMenu.value = visible
    menuActive = visible
    emits('dropdownVisible', visible)
  },
}

const disableMenu = (name: string) => {
  return options.value.disableExtensions.includes(name)
}

const openAssistant = () => {
  assistant.value = true
  editor.value?.commands.selectParentNode()
  editor.value?.commands.focus()
  const { from, to } = editor.value?.state.selection ?? {}
  editor.value?.commands.setTextSelection({ from: from ?? 0, to: to ?? 0 })
}

/**
 * Отправляет в ai.onCommand команду `add-to-selection` для текущего контекста блока.
 *
 * Приоритет:
 * 1) если есть явное текстовое выделение внутри блока — в payload уходит только выделенный фрагмент
 *    и его диапазон (selFrom..selTo);
 * 2) если выделения нет — используем hovered-блок DragHandle (activeBlockNode/activeBlockPos)
 *    и берём весь текст узла с диапазоном nodePos..nodePos+nodeSize.
 *
 * Таким образом, правая AI-панель Deal получает ровно тот текст, который видит пользователь,
 * а не всегда полный абзац.
 */
const sendAiAddBlock = async () => {
  const onCommand = options.value.ai?.onCommand
  if (!onCommand || !editor.value) {
    return
  }

  const ed = editor.value
  const node: any = activeBlockNode?.value ?? getSelectionNode(ed)
  const pos: number | null = activeBlockPos?.value ?? ed.state.selection.from
  const { from: selFrom, to: selTo, empty } = ed.state.selection

  let text: string
  let from = selFrom
  let to = selTo

  if (!empty) {
    // Явное текстовое выделение: добавляем к общей выборке только этот фрагмент.
    text = (getSelectionText(ed) ?? '').toString()
  } else {
    // Без выделения: добавляем целый hovered‑блок.
    text = (node?.textContent ?? getSelectionText(ed) ?? '').toString()
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

const onAiMenuClick = () => {
  // Открываем общий inline-tooltip на главной AI-кнопке и закрываем дропдаун.
  if (openAiInlineTooltip) {
    openAiInlineTooltip()
  }
  emits('dropdownVisible', false)
}

const setTemplate = ({ content }: Template) => {
  if (!content || !editor.value) {
    return
  }
  editor.value.commands.insertContent(content)
}
</script>

<style lang="less">
.umo-ai-menu-button.umo-menu-button,
.umo-block-menu .umo-ai-menu-button.umo-menu-button {
  position: relative;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(
    135deg,
    #466bff,
    #ff58c7,
    #915dff
  );
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 6px 14px rgba(0, 0, 0, 0.25);

  .umo-button-content {
    color: #fff;
    .umo-button-text {
      display: block;
      font-weight: 500;
    }

    .umo-button-icon,
    :deep(.umo-icon) {
      color: #fff !important;
      fill: #fff !important;
      stroke: #fff !important;
    }
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

.umo-ai-inline-tooltip {
  padding: 8px 10px;
  min-width: 220px;
  max-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.umo-ai-inline-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
</style>
