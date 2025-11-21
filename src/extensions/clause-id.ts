import { Extension } from '@tiptap/core'

/**
 * Глобальный extension, добавляющий атрибут clauseId/data-clause-id
 * к абзацам и заголовкам. Нужен для стабильной привязки AI/рисков
 * к конкретным блокам договора.
 */
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
})
