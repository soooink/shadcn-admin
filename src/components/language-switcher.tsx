import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={i18n.language === 'en-US' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => changeLanguage('en-US')}
      >
        EN
      </Button>
      <Button
        variant={i18n.language === 'zh-CN' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => changeLanguage('zh-CN')}
      >
        中文
      </Button>
    </div>
  )
}