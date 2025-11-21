<template>
  <menus-button
    ico="assistant"
    :text="t('assistant.text')"
    @menu-click="openAssistant"
  />
</template>

<script setup lang="ts">
import { getSelectionNode, getSelectionHtml, getSelectionText } from '@/extensions/selection'

const editor = inject('editor')
const assistant = inject('assistant')
const options = inject('options')

const openAssistant = async () => {
  // Открываем встроенное окно ассистента (старое поведение)
  assistant.value = true
  editor.value?.commands.focus()

  // Параллельно, если настроен внешний ai.onCommand, отправляем payload
  const onCommand = options.value.ai?.onCommand
  if (!onCommand || !editor.value) {
    return
  }
  const ed = editor.value
  const text = getSelectionText(ed) ?? ''
  const html = getSelectionHtml(ed) || undefined
  const node = getSelectionNode(ed)
  const clauseId = (node?.attrs?.clauseId as string | null) ?? null
  const { from, to } = ed.state.selection

  await onCommand({
    type: 'assistant-open',
    text,
    html,
    clauseId: clauseId ?? undefined,
    range: { from, to },
  })
}
</script>

<style lang="less" scoped></style>
