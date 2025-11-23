<template>
  <drag-handle :editor="editor" :tippy-options="tippyOpitons" class="umo-block-menu-drag-handle"
    :class="{ 'is-empty': editor.isEmpty }" @node-change="nodeChange">
    <div class="umo-block-menu-hander" :class="`umo-selected-node-${selectedNode?.type?.name || 'unknown'} `">
      <menus-context-block-node @dropdown-visible="dropdownVisible" />
      <menus-context-block-common v-if="
        !editor.isEmpty ||
        editor.isActive('table') ||
        editor.isActive('callout')
      " :node="selectedNode" :pos="selectedNodePos" @dropdown-visible="dropdownVisible" />
      <t-popup
        v-if="showAiButton"
        v-model="aiInlineVisible"
        placement="right-top"
        trigger="click"
        :attach="container"
      >
        <t-tooltip :content="t('assistant.editBlock')" placement="top">
          <t-button
            class="umo-ai-menu-button around-button"
            variant="text"
            size="small"
          >
            <svg
              class="umo-ai-icon"
              width="16"
              height="16"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M24 28V24"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M24 20H24.01"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </t-button>
        </t-tooltip>
        <template #content>
          <div class="umo-ai-inline-tooltip">
            <t-textarea
              v-model="aiInstruction"
              size="small"
              :placeholder="t('assistant.placeholder')"
              autosize
            />
            <div class="umo-ai-inline-actions">
              <t-button
                size="small"
                variant="text"
                theme="default"
                @click="onAiInlineCancel"
              >
                {{ t('assistant.exit') }}
              </t-button>
              <t-button
                size="small"
                theme="primary"
                :disabled="!aiInstruction.trim()"
                @click="onAiInlineApply"
              >
                {{ t('assistant.send') }}
              </t-button>
            </div>
          </div>
        </template>
      </t-popup>
    </div>
  </drag-handle>
</template>

<script setup lang="ts">
import DragHandle from '@tiptap-pro/extension-drag-handle-vue-3'
import type { Instance } from 'tippy.js'

import { getSelectionHtml, getSelectionNode, getSelectionText } from '@/extensions/selection'

const editor = inject('editor')
const options = inject('options')
const container = inject('container')
let selectedNode = $ref<any | null>(null)
let selectedNodePos = $ref<number | null>(null)

let aiInlineVisible = $ref(false)
let aiInstruction = $ref('')

// Делаем hovered-блок доступным во вложенных меню (плюс-меню и т.п.)
provide('activeBlockNode', computed(() => selectedNode))
provide('activeBlockPos', computed(() => selectedNodePos))
// Даём plus-меню доступ к управлению тем же inline-tooltip
provide('openAiInlineTooltip', (initialInstruction?: string) => {
  if (typeof initialInstruction === 'string') {
    aiInstruction = initialInstruction
  }
  aiInlineVisible = true
})

let tippyInstance = $ref<Instance | null>(null)
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
  // Показываем AI-кнопку для любого выбранного блока, если есть обработчик ai.onCommand
  return !!selectedNode
})

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

  aiInlineVisible = false
  aiInstruction = ''
}

const onAiInlineCancel = () => {
  aiInlineVisible = false
  aiInstruction = ''
}

const onAiInlineApply = async () => {
  await applyInlineAiEdit()
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

onMounted(() => {
  editor.value.on('selectionUpdate', updateMenuPostion)
})

const nodeChange = ({ node, pos }: { node: Node | null; pos: number }) => {
  selectedNode = node ?? null
  if (pos !== null) {
    selectedNodePos = pos
  }
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
  border-bottom-left-radius: 50%;
  border-bottom-right-radius: 50%;
  border-top-left-radius: 0;
  border-top-right-radius: 50%;
}

// Стили для AI-кнопки слева от блока
.umo-ai-menu-button.around-button {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    #466bff,
    #ff58c7,
    #915dff
  );
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 6px 14px rgba(0, 0, 0, 0.25);

  .umo-ai-icon {
    display: block;
    color: #fff;
    fill: none;
    stroke: currentColor;
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
