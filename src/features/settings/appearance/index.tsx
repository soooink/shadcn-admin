import ContentSection from '../components/content-section'
import { AppearanceForm } from './appearance-form'
import { useTranslation } from 'react-i18next'

export default function SettingsAppearance() {
    const { t } = useTranslation('settings')
  return (
    <ContentSection
      title={t('settings.appearance')}
      desc={t('appearanceForm.description')}
    >
      <AppearanceForm />
    </ContentSection>
  )
}
