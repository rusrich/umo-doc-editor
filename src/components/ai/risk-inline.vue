<template>
  <div v-if="markers.length" class="umo-risk-inline-layer">
    <div
      v-for="marker in markers"
      :key="marker.clauseId"
      class="umo-risk-inline-callout"
      :style="{ top: `${marker.top}px`, left: `${marker.left}px`, width: `${marker.width}px` }"
      @click.stop="handleMarkerClick(marker)"
    >
      <span :class="['umo-risk-inline-dot', `sev-${marker.severity}`]" />
      <span class="umo-risk-inline-title">{{ marker.title || getSeverityLabel(marker.severity) }}</span>
      <span v-if="marker.count && marker.count > 1" class="umo-risk-inline-count">×{{ marker.count }}</span>
    </div>
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
  left: number
  width: number
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

  const next: RiskMarker[] = []

  for (const [clauseId, badge] of riskEntries) {
    const el = pageContent.querySelector<HTMLElement>(
      `[data-clause-id="${clauseId}"]`,
    )
    if (!el) continue
    const rect = el.getBoundingClientRect()
    const parentRect = pageContent.getBoundingClientRect()
    next.push({
      clauseId,
      top: rect.bottom - parentRect.top + 2,
      left: rect.left - parentRect.left + 2,
      width: Math.max(120, Math.min(rect.width - 8, 360)),
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
  nextTick(() => recomputeMarkers())
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
  if (s === 'high') return 'Высокий риск'
  if (s === 'medium') return 'Средний риск'
  if (s === 'low') return 'Низкий риск'
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
.umo-risk-inline-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.umo-risk-inline-callout {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background-color: var(--umo-page-background, #fff);
  pointer-events: auto;
  font-size: 12px;
  color: var(--umo-text-color, #444);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.umo-risk-inline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.06) inset;
}
.umo-risk-inline-dot.sev-high { background-color: #ff4d4f; }
.umo-risk-inline-dot.sev-medium { background-color: #faad14; }
.umo-risk-inline-dot.sev-low { background-color: #52c41a; }

.umo-risk-inline-title { font-weight: 500; }
.umo-risk-inline-count { color: #777; }
</style>