import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import AuthLayout from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function SignUp() {
    const { t } = useTranslation("auth")
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            {t('signUp.createAnAccount')}
          </CardTitle>
          
          <CardDescription>
            {t('signUp.enterEAPTCA')}. <br />
            {t('signUp.alreadyHaveAnAccount')}{' '}
            <Link
              to='/sign-in'
              className='hover:text-primary underline underline-offset-4'
            >
              {t('signUp.signIn')}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            {t('signUp.byCreatingAnAccountYouAgreeToOur')}{' '}
            <a
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              {t('signUp.termsOfService')}
            </a>{' '}
            {t('and')}{' '}
            <a
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              {t('signUp.privacyPolicy')}
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
