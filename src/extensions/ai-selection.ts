import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export type AiSelectionRange = { from: number; to: number }

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
                const decorations = safeRanges.map(({ from, to }) =>
                  Decoration.inline(from, to, { class: 'umo-ai-selection' }),
                )
                return DecorationSet.create(tr.doc, decorations)
              } catch {
                return DecorationSet.empty
              }
            }

            if (tr.docChanged) {
              deco = deco.map(tr.doc, tr.mapping)
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
