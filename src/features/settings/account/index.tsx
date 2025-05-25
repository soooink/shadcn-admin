import ContentSection from '../components/content-section'
import { AccountForm } from './account-form'
import { useTranslation } from 'react-i18next'
export default function SettingsAccount() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title={t('settings.account')}
      desc={t('accountForm.description')}
    >
      <AccountForm />
    </ContentSection>
  )
}
