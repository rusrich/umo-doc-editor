import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface AiDiffOptions {
  onAccept?: () => void
  onReject?: () => void
}

export interface SetAiDiffParams {
  from: number
  to: number
  beforeText: string
  afterText: string
  onAccept?: () => void
  onReject?: () => void
}

/**
 * Расширение для inline-отображения AI-правок (до/после) в стиле VSCode.
 * 
 * Команды:
 * - setAiDiff({ from, to, beforeText, afterText }) — устанавливает diff-подсветку
 * - clearAiDiff() — убирает diff-подсветку
 * 
 * Подсветка:
 * - Старый текст (beforeText) — красный фон
 * - Новый текст (afterText) — зелёный фон, вставляется после старого
 */
export const AiDiff = Extension.create<AiDiffOptions>({
  name: 'aiDiff',

  addOptions() {
    return {
      onAccept: undefined,
      onReject: undefined,
    }
  },

  addCommands() {
    return {
      setAiDiff:
        (params: SetAiDiffParams) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta('aiDiffSet', params)
          }
          return true
        },
      clearAiDiff:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta('aiDiffClear', true)
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('aiDiff')

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return {
              active: false,
              from: 0,
              to: 0,
              beforeText: '',
              afterText: '',
              onAccept: undefined,
              onReject: undefined,
            }
          },
          apply(tr, oldState) {
            const setMeta = tr.getMeta('aiDiffSet')
            if (setMeta) {
              return {
                active: true,
                from: setMeta.from,
                to: setMeta.to,
                beforeText: setMeta.beforeText,
                afterText: setMeta.afterText,
                onAccept: setMeta.onAccept,
                onReject: setMeta.onReject,
              }
            }
            if (tr.getMeta('aiDiffClear')) {
              return {
                active: false,
                from: 0,
                to: 0,
                beforeText: '',
                afterText: '',
                onAccept: undefined,
                onReject: undefined,
              }
            }
            // Если документ изменился извне, сбрасываем diff
            if (tr.docChanged && oldState.active) {
              return {
                active: false,
                from: 0,
                to: 0,
                beforeText: '',
                afterText: '',
                onAccept: undefined,
                onReject: undefined,
              }
            }
            return oldState
          },
        },
        props: {
          decorations(state) {
            const pluginState = pluginKey.getState(state)
            if (!pluginState || !pluginState.active) {
              return DecorationSet.empty
            }

            const decorations: Decoration[] = []
            const { from, to, afterText, onAccept, onReject } = pluginState

            // Красный фон для старого текста (будет заменён)
            decorations.push(
              Decoration.inline(from, to, {
                class: 'umo-ai-diff-before',
                style: 'background-color: rgba(255, 0, 0, 0.15); text-decoration: line-through;',
              }),
            )

            // Зелёный блок с новым текстом (вставляется виртуально через widget)
            if (afterText) {
              decorations.push(
                Decoration.widget(to, () => {
                  const wrapper = document.createElement('span')
                  wrapper.className = 'umo-ai-diff-after'
                  wrapper.style.cssText =
                    'background-color: rgba(0, 255, 0, 0.15); padding: 2px 4px; margin: 0 2px; border-radius: 2px; display: inline;'
                  wrapper.textContent = afterText
                  return wrapper
                }),
              )
            }

            // Inline-кнопки "Применить" и "Отменить"
            if (onAccept || onReject) {
              decorations.push(
                Decoration.widget(to, () => {
                  const container = document.createElement('span')
                  container.className = 'umo-ai-diff-actions'
                  container.style.cssText =
                    'display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; vertical-align: middle;'

                  if (onAccept) {
                    const acceptBtn = document.createElement('button')
                    acceptBtn.textContent = '✓ Применить'
                    acceptBtn.className = 'umo-ai-diff-accept-btn'
                    acceptBtn.style.cssText =
                      'background: #52c41a; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; font-weight: 500;'
                    acceptBtn.onclick = (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onAccept()
                    }
                    acceptBtn.onmouseenter = () => {
                      acceptBtn.style.background = '#73d13d'
                    }
                    acceptBtn.onmouseleave = () => {
                      acceptBtn.style.background = '#52c41a'
                    }
                    container.appendChild(acceptBtn)
                  }

                  if (onReject) {
                    const rejectBtn = document.createElement('button')
                    rejectBtn.textContent = '× Отмена'
                    rejectBtn.className = 'umo-ai-diff-reject-btn'
                    rejectBtn.style.cssText =
                      'background: #ff4d4f; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; font-weight: 500;'
                    rejectBtn.onclick = (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onReject()
                    }
                    rejectBtn.onmouseenter = () => {
                      rejectBtn.style.background = '#ff7875'
                    }
                    rejectBtn.onmouseleave = () => {
                      rejectBtn.style.background = '#ff4d4f'
                    }
                    container.appendChild(rejectBtn)
                  }

                  return container
                }),
              )
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

export default AiDiff
