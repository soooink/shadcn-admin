import ContentSection from '../components/content-section'
import { DisplayForm } from './display-form'
import { useTranslation } from 'react-i18next'

export default function SettingsDisplay() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title={t('displayForm.title')}
      desc={t('displayForm.description')}
    >
      <DisplayForm />
    </ContentSection>
  )
}
