<template>
  <div v-if="markers.length" class="umo-risk-layer">
    <t-tooltip v-for="marker in markers" :key="marker.clauseId"
      :content="marker.title || getSeverityLabel(marker.severity)" placement="top">
      <button type="button" class="umo-risk-layer-chip" :style="{ top: `${marker.top}px` }"
        @click.stop="handleMarkerClick(marker)">
        <span :class="['umo-risk-layer-dot', `sev-${marker.severity}`]" />
        <span class="umo-risk-layer-text">
          {{ getSeverityLabel(marker.severity) }}<span v-if="marker.count && marker.count > 1"> ×{{ marker.count
            }}</span>
        </span>
      </button>
    </t-tooltip>
  </div>
</template>

<script setup lang="ts">
type RiskBadge = {
  clauseId: string
  severity: 'low' | 'medium' | 'high' | string
  hasMultiple: boolean
  count?: number
  primaryRiskId?: string
  title?: string
}

type RiskMarker = {
  clauseId: string
  top: number
  severity: 'low' | 'medium' | 'high' | string
  hasMultiple: boolean
  count?: number
  primaryRiskId?: string
  title?: string
}

const editor = inject<any>('editor')
const options = inject<any>('options')
const container = inject<string>('container')

const markers = ref<RiskMarker[]>([])

const risks = computed<Record<string, RiskBadge>>(
  () => (options?.value?.ai?.risks ?? {}) as Record<string, RiskBadge>,
)

const recomputeMarkers = () => {
  const ed = editor?.value
  if (!ed) return

  const riskEntries = Object.entries(risks.value) as [string, RiskBadge][]
  if (!riskEntries.length) {
    markers.value = []
    return
  }

  const pageContent = document.querySelector(
    `${container} .umo-page-content`,
  ) as HTMLElement | null
  if (!pageContent) {
    markers.value = []
    return
  }

  const rootRect = pageContent.getBoundingClientRect()
  const next: RiskMarker[] = []

  for (const [clauseId, badge] of riskEntries) {
    const el = pageContent.querySelector<HTMLElement>(
      `[data-clause-id="${clauseId}"]`,
    )
    if (!el) continue
    const rect = el.getBoundingClientRect()
    next.push({
      clauseId,
      top: rect.top - rootRect.top,
      severity: badge.severity || 'medium',
      hasMultiple: Boolean(badge.hasMultiple),
      count: badge.count,
      primaryRiskId: badge.primaryRiskId,
      title: badge.title,
    })
  }

  markers.value = next
}

let scrollParent: HTMLElement | null = null

watch(
  () => risks.value,
  () => {
    recomputeMarkers()
  },
  { deep: true },
)

onMounted(() => {
  nextTick(() => {
    recomputeMarkers()
  })

  window.addEventListener('resize', recomputeMarkers)
  scrollParent = document.querySelector(
    `${container} .umo-zoomable-container`,
  ) as HTMLElement | null
  scrollParent?.addEventListener('scroll', recomputeMarkers)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', recomputeMarkers)
  scrollParent?.removeEventListener('scroll', recomputeMarkers)
})

const getSeverityLabel = (severity: string | undefined) => {
  const s = (severity || '').toLowerCase()
  if (s === 'high') return 'Высокий'
  if (s === 'medium') return 'Средний'
  if (s === 'low') return 'Низкий'
  return 'Риск'
}

const handleMarkerClick = (marker: RiskMarker) => {
  const onCommand = options.value.ai?.onCommand
  const ed = editor.value
  if (!onCommand || !ed) return

  let targetNode: any = null
  let targetPos: number | null = null

  ed.state.doc.descendants((node: any, pos: number) => {
    if (
      (node.type.name === 'paragraph' || node.type.name === 'heading') &&
      node.attrs?.clauseId === marker.clauseId
    ) {
      targetNode = node
      targetPos = pos
      return false
    }
    return true
  })

  const pos = targetPos ?? ed.state.selection.from
  const from = pos
  const to = targetNode ? pos + targetNode.nodeSize : ed.state.selection.to
  const text = (targetNode?.textContent ?? '').toString()

  void onCommand({
    type: 'risk-focus',
    text,
    clauseId: marker.clauseId,
    range: { from, to },
    riskId: marker.primaryRiskId,
  })
}
</script>

<style lang="less" scoped>
.umo-risk-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.umo-risk-layer-chip {
  position: absolute;
  left: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background-color: var(--umo-page-background, #fff);
  cursor: pointer;
  pointer-events: auto;
  font-size: 11px;
  white-space: nowrap;
}

.umo-risk-layer-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) inset;
}

.umo-risk-layer-dot.sev-high {
  background-color: #ff4d4f;
}

.umo-risk-layer-dot.sev-medium {
  background-color: #faad14;
}

.umo-risk-layer-dot.sev-low {
  background-color: #52c41a;
}

.umo-risk-layer-text {
  color: var(--umo-text-color, #555);
}
</style>
