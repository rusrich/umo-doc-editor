import { type Editor, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setCurrentNodeSelection: {
      setCurrentNodeSelection: () => ReturnType
    }
    deleteSelectionNode: {
      deleteSelectionNode: () => ReturnType
    }
  }
}
export default Extension.create({
  name: 'selection',
  addProseMirrorPlugins() {
    const { editor } = this

    return [
      new Plugin({
        key: new PluginKey('selection'),
        props: {
          decorations(state) {
            if (state.selection.empty) {
              return null
            }

            // if (editor.isFocused) {
            //   return null
            // }

            return DecorationSet.create(state.doc, [
              Decoration.inline(state.selection.from, state.selection.to, {
                class: 'umo-text-selection',
              }),
            ])
          },
        },
      }),
    ]
  },
  addCommands() {
    return {
      setCurrentNodeSelection:
        () =>
        ({ editor, chain }) => {
          editor.commands.selectParentNode()
          const { $anchor } = editor.state.selection
          return chain()
            .setNodeSelection($anchor.pos - $anchor.depth)
            .run()
        },
      deleteSelectionNode:
        () =>
        ({ editor, commands }) => {
          const node = getSelectionNode(editor)
          if (!node) {
            return false
          }
          // if (node.attrs.vnode) {
          //   if (
          //     editor.isActive('image') ||
          //     editor.isActive('video') ||
          //     editor.isActive('audio') ||
          //     editor.isActive('file')
          //   ) {
          //     const { options } = editor.storage
          //     const { id, src } = node.attrs
          //     options.onFileDelete?.(id, src)
          //   }
          // }
          if (commands.deleteSelection()) {
            return true
          }
          return commands.deleteNode(node.type.name)
        },
    }
  },
})
export function getSelectionNode(editor: Editor) {
  const selection: any = editor.state.selection
  const explicitNode = selection.node as any | null

  // Если явно выбрана нода (NodeSelection) — возвращаем её как есть
  // (изображения, таблицы, виджеты и т.п.).
  if (explicitNode) {
    return explicitNode
  }

  const $anchor = selection.$anchor
  if (!$anchor) {
    return null
  }

  // 1. В первую очередь ищем ближайший paragraph/heading —
  // именно на них навешивается clauseId и завязан Deal.
  for (let depth = $anchor.depth; depth > 0; depth--) {
    const nodeAtDepth = $anchor.node(depth) as any
    if (
      nodeAtDepth?.type?.name === 'paragraph' ||
      nodeAtDepth?.type?.name === 'heading'
    ) {
      return nodeAtDepth
    }
  }

  // 2. Если подходящего абзаца/заголовка нет, берём ближайший блочный узел
  // (списки, таблицы, callout и т.п.).
  for (let depth = $anchor.depth; depth > 0; depth--) {
    const nodeAtDepth = $anchor.node(depth) as any
    if (nodeAtDepth?.isBlock) {
      return nodeAtDepth
    }
  }

  return null
}
export function getSelectionText(editor: Editor) {
  const { from, to, empty } = editor.state.selection
  if (empty) {
    return ''
  }
  return editor.state.doc.textBetween(from, to, '')
}

/**
 * Возвращает HTML текущего выделения, используя DOM Range ProseMirror.
 * Используется только для построения AI‑payloadов, поэтому допускает
 * приблизительную разметку и в случае ошибки возвращает пустую строку.
 */
export function getSelectionHtml(editor: Editor): string {
  const { from, to, empty } = editor.state.selection
  if (empty) {
    return ''
  }
  try {
    const view = editor.view
    const domRange = document.createRange()
    const start = view.domAtPos(from)
    const end = view.domAtPos(to)
    domRange.setStart(start.node, start.offset)
    domRange.setEnd(end.node, end.offset)
    const wrapper = document.createElement('div')
    wrapper.appendChild(domRange.cloneContents())
    return wrapper.innerHTML
  } catch {
    return ''
  }
}

// 设置选中区域 包含选中效果
export function setSelectionText(
  editor: Editor,
  prevDocLength: number,
  from: number,
  to: number,
) {
  const state = editor?.state
  // 计算新的文档长度
  const newDocLength = state.doc.content.size
  // 计算插入内容后的实际结束位置
  const newTo = to + (newDocLength - prevDocLength)
  if (newTo <= from) {
    return false
  }
  const selection = TextSelection.create(state.doc, from, newTo)
  const { tr } = editor.view.state
  if (tr && selection) {
    tr.setSelection(selection)
    editor.view.dispatch(tr)
    editor?.commands.focus()
  }
}
