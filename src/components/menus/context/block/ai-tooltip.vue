<template>
  <div class="umo-ai-inline-tooltip">
    <div class="tooltip-input-wrapper">
      <input
        v-model="localInstruction"
        type="text"
        placeholder="Инструкция для ИИ"
        class="tooltip-input"
        @keyup.enter="!hasPending && localInstruction.trim() ? onSend() : null"
      />
      <div class="tooltip-actions">
        <template v-if="!hasPending">
          <button
            class="tooltip-action-btn tooltip-send-btn"
            :disabled="!localInstruction.trim() || loading"
            @click="onSend"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
        <template v-else>
          <button
            class="tooltip-action-btn tooltip-accept-btn"
            @click="onAccept"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button
            class="tooltip-action-btn tooltip-reject-btn"
            @click="onReject"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </div>
    </div>
    <div v-if="hasPending && pendingResult?.afterText" class="tooltip-diff-preview">
      <div class="diff-text after">
        {{ pendingResult.afterText }}
      </div>
    </div>
    <div class="tooltip-bottom-row">
      <span class="tooltip-label">Тип вставки</span>
      <select v-model="localMode" class="tooltip-select">
        <option value="replace">Заменить</option>
        <option value="insert-after">После</option>
        <option value="insert-below">Ниже</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  instruction: string
  mode: 'replace' | 'insert-after' | 'insert-below'
  loading?: boolean
  hasPending?: boolean
  pendingResult?: { beforeText: string; afterText: string }
}>()

const emit = defineEmits<{
  'update:instruction': [value: string]
  'update:mode': [value: string]
  send: []
  cancel: []
  accept: []
  reject: []
}>()

const localInstruction = ref(props.instruction)
const localMode = ref(props.mode)

watch(() => props.instruction, (val) => { localInstruction.value = val })
watch(() => props.mode, (val) => { localMode.value = val })
watch(localInstruction, (val) => emit('update:instruction', val))
watch(localMode, (val) => emit('update:mode', val as any))

const onSend = () => emit('send')
const onCancel = () => emit('cancel')
const onAccept = () => emit('accept')
const onReject = () => emit('reject')
</script>

<style lang="less" scoped>
.umo-ai-inline-tooltip {
  padding: 16px;
  min-width: 380px;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .tooltip-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;

    .tooltip-input {
      width: 100%;
      height: 44px;
      padding: 0 56px 0 16px;
      border: 1px solid #e0e0e0;
      border-radius: 22px;
      font-size: 14px;
      color: #333;
      outline: none;
      transition: border-color 0.2s;

      &::placeholder {
        color: #bbb;
      }

      &:focus {
        border-color: #1890ff;
      }
    }

    .tooltip-actions {
      position: absolute;
      right: 4px;
      display: flex;
      align-items: center;
      gap: 6px;

      .tooltip-action-btn {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        svg {
          display: block;
        }
      }

      .tooltip-send-btn {
        background: #1890ff;
        color: #fff;

        &:hover:not(:disabled) {
          background: #40a9ff;
          transform: scale(1.05);
        }

        &:active:not(:disabled) {
          transform: scale(0.95);
        }
      }

      .tooltip-accept-btn {
        background: #52c41a;
        color: #fff;

        &:hover {
          background: #73d13d;
          transform: scale(1.05);
        }

        &:active {
          transform: scale(0.95);
        }
      }

      .tooltip-reject-btn {
        background: #ff4d4f;
        color: #fff;

        &:hover {
          background: #ff7875;
          transform: scale(1.05);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }

  .tooltip-bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
    color: #999;

    .tooltip-label {
      white-space: nowrap;
      font-weight: 400;
    }

    .tooltip-select {
      padding: 4px 24px 4px 8px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      font-size: 13px;
      color: #333;
      background: #fff;
      cursor: pointer;
      outline: none;
      min-width: 120px;

      &:hover {
        border-color: #40a9ff;
      }

      &:focus {
        border-color: #1890ff;
      }
    }
  }

  .tooltip-diff-preview {
    padding: 12px;
    border-radius: 8px;
    background-color: #f5f5f5;
    font-size: 13px;
    max-height: 150px;
    overflow-y: auto;
    line-height: 1.6;

    .diff-text {
      padding: 8px;
      border-radius: 4px;

      &.after {
        background-color: rgba(82, 196, 26, 0.1);
        color: #52c41a;
        border-left: 3px solid #52c41a;
      }
    }
  }
}
</style>
