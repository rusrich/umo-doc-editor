import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

import { shortId } from '@/utils/short-id'

/**
 * Глобальный extension, добавляющий атрибут clauseId/data-clause-id
 * к абзацам и заголовкам. Нужен для стабильной привязки AI/рисков
 * к конкретным блокам договора.
 */
const CLAUSE_ID_PLUGIN_KEY = new PluginKey('clauseIdAutoAssign')

const generateClauseId = () => `clause-${shortId(8)}`

export default Extension.create({
  name: 'clauseId',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          clauseId: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-clause-id') || null,
            renderHTML: (attributes) => {
              if (!attributes.clauseId) {
                return {}
              }
              return {
                'data-clause-id': attributes.clauseId,
              }
            },
          },
        },
      },
    ]
  },

  /**
   * Автоматически проставляет clauseId для всех абзацев и заголовков,
   * у которых он ещё не задан (ни в HTML, ни в attrs узла).
   *
   * Поведение:
   * - при первом открытии документа каждый paragraph/heading без data-clause-id
   *   получает стабильный clauseId вида `clause-xxxxxx`;
   * - при последующих правках новые блоки также получают clauseId;
   * - существующие clauseId никогда не перезаписываются.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: CLAUSE_ID_PLUGIN_KEY,
        appendTransaction(transactions, _oldState, newState) {
          // Если документ не менялся — ничего не делаем.
          if (!transactions.some((tr) => tr.docChanged)) {
            return null
          }

          const tr = newState.tr
          let modified = false

          newState.doc.descendants((node, pos) => {
            if (
              (node.type.name === 'paragraph' || node.type.name === 'heading') &&
              (!node.attrs?.clauseId || typeof node.attrs.clauseId !== 'string')
            ) {
              const clauseId = generateClauseId()
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                clauseId,
              })
              modified = true
              // eslint-disable-next-line no-console
              console.log('[umo][clauseId] auto-assign', clauseId, 'at pos', pos)
            }
          })

          return modified ? tr : null
        },
      }),
    ]
  },
})
