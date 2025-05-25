import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import AuthLayout from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function SignIn() {
    const { t } = useTranslation("auth")
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>{t('signIn.login')}</CardTitle>
          <CardDescription>
            {t('signIn.enterEAPTCA')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            {t('signIn.byCreatingAnAccountYouAgreeToOur')}
            <a
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              {t('signIn.termsOfService')}
            </a>{' '}
            {t('signIn.and')}{' '}
            <a
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              {t('signIn.privacyPolicy')}
            </a>
            .
          </p>
        </CardFooter>
        <div className="flex justify-center mt-4">
          <LanguageSwitcher />
        </div>
      </Card>
    </AuthLayout>
  )
}
