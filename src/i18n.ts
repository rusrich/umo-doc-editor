import { createI18n } from 'vue-i18n'

import en_US from './locales/en-US.json'
import zh_CN from './locales/zh-CN.json'
import ru_RU from './locales/ru-RU.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  defaultLocale: 'zh-CN',
  warnHtmlMessage: false,
  messages: {
    en: en_US,
    'en-US': en_US,
    zh: zh_CN,
    'zh-CN': zh_CN,
    ru: ru_RU,
    'ru-RU': ru_RU,
    // Временный alias: казахский интерфейс будет добавлен отдельно,
    // пока используем русские строки как fallback.
    'kk-KZ': ru_RU,
  },
})
