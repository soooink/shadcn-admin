// src/i18n/config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 使用 import.meta.glob 动态导入所有翻译文件
const modules = import.meta.glob('./locales/**/*.ts', { eager: true })

const resources = Object.entries(modules).reduce((acc, [path, module]: [string, any]) => {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.ts$/)
  if (match) {
    const [, lang, ns] = match
    if (!acc[lang]) acc[lang] = {}
    acc[lang][ns] = module.default
  }
  return acc
}, {} as Record<string, Record<string, any>>)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en-US',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,
    },
    ns: ['common', 'apps'],
    defaultNS: 'common'
  })

export default i18n