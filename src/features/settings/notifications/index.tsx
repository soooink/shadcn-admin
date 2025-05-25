import ContentSection from '../components/content-section'
import { NotificationsForm } from './notifications-form'
import { useTranslation } from 'react-i18next'

export default function SettingsNotifications() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title={t('notificationsForm.title')}
      desc={t('notificationsForm.description')}
    >
      <NotificationsForm />
    </ContentSection>
  )
}
