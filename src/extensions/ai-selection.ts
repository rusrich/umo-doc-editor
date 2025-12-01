import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export type AiSelectionRange = {
  from: number
  to: number
  /**
   * Необязательная "семантика" выделения для AI-подсветки.
   * Используется, например, для рисков (low/medium/high), чтобы
   * окрасить подсветку в соответствующий цвет.
   */
  severity?: 'low' | 'medium' | 'high' | string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiSelection: {
      /**
       * Установить один или несколько диапазонов, которые будут подсвечены
       * как "AI-выбранные" блоки (мульти‑блочное выделение для контекста ИИ).
       */
      setAiSelections: (ranges: AiSelectionRange[]) => ReturnType
      /** Очистить все AI‑подсветки. */
      clearAiSelections: () => ReturnType
    }
  }
}

export default Extension.create({
  name: 'ai-selection',

  addCommands() {
    return {
      setAiSelections:
        (ranges: AiSelectionRange[]) =>
        ({ tr, dispatch }) => {
          if (!dispatch) return false
          dispatch(tr.setMeta('aiSelections', ranges ?? []))
          return true
        },
      clearAiSelections:
        () =>
        ({ tr, dispatch }) => {
          if (!dispatch) return false
          dispatch(tr.setMeta('aiSelections', []))
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('ai-selection'),
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old: DecorationSet) {
            const meta = tr.getMeta('aiSelections') as
              | AiSelectionRange[]
              | undefined

            let deco = old

            if (meta) {
              if (!meta.length) {
                return DecorationSet.empty
              }

              const safeRanges = meta.filter(
                (r) =>
                  typeof r?.from === 'number' &&
                  typeof r?.to === 'number' &&
                  r.to > r.from,
              )

              if (!safeRanges.length) {
                return DecorationSet.empty
              }

              try {
                const decorations = safeRanges.map(({ from, to, severity }) => {
                  const s = (severity || '').toString().toLowerCase()
                  const sevClass =
                    s === 'high' || s === 'medium' || s === 'low'
                      ? `umo-ai-selection--sev-${s}`
                      : ''
                  const className = ['umo-ai-selection', sevClass]
                    .filter(Boolean)
                    .join(' ')
                  return Decoration.inline(from, to, { class: className })
                })
                return DecorationSet.create(tr.doc, decorations)
              } catch {
                return DecorationSet.empty
              }
            }

            // При любых изменениях документа аккуратно маппим существующие декорации
            // через стандартный API prosemirror-view: DecorationSet.map(mapping, doc).
            // Ранее здесь было deco.map(tr.doc, tr.mapping), что приводило к
            // ошибке "Cannot read properties of undefined (reading 'length')" при
            // доступе к mapping.maps внутри DecorationSet.map.
            if (tr.docChanged) {
              deco = deco.map(tr.mapping, tr.doc)
            }
            return deco
          },
        },
        props: {
          decorations(state) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (this as any).getState(state)
          },
        },
      }),
    ]
  },
})
