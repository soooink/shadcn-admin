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
import { ForgotPasswordForm } from './components/forgot-password-form'
import { useTranslation } from 'react-i18next'

export default function ForgotPassword() {
  const { t } = useTranslation('auth')
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            {t('forgotPassword.title')}
          </CardTitle>
          <CardDescription>
            {t('forgotPassword.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            {t('forgotPassword.footer')}
            <Link
              to='/sign-up'
              className='hover:text-primary underline underline-offset-4'
            >
              {t('forgotPassword.signUp')}
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
