import 'virtual:svg-icons-register'

import type { UmoEditorOptions } from '@/types'

import { createDealEditorOptions, dealBaseOptions, dealEditorOptions } from '@/deal-options'
import UmoEditor from './index.vue'
import UmoMenuButton from './menus/button.vue'
import UmoDialog from './modal.vue'
import UmoTooltip from './tooltip.vue'

const useUmoEditor = {
  install: (app: any, options?: Partial<UmoEditorOptions>) => {
    app.provide('defaultOptions', options ?? {})
    app.component(UmoEditor.name ?? 'UmoEditor', UmoEditor)
  },
}

export {
  UmoEditor as default,
  UmoDialog,
  UmoEditor,
  UmoMenuButton,
  UmoTooltip,
  useUmoEditor,
  // Deal‑пресет и фабрика для применения в приложении
  dealBaseOptions,
  dealEditorOptions,
  createDealEditorOptions,
}
