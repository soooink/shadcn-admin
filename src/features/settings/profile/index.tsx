import ContentSection from '../components/content-section'
import ProfileForm from './profile-form'
import { useTranslation } from 'react-i18next'

export default function SettingsProfile() {
  const { t } = useTranslation('settings')
  return (
    <ContentSection
      title={t('profileForm.title')}
      desc={t('profileForm.description')}
    >
      <ProfileForm />
    </ContentSection>
  )
}
