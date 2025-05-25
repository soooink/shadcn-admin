import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export default function NotFoundError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  const { t } = useTranslation('errors')
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>{t('notFoundError.title')}</h1>
        <span className='font-medium'>{t('notFoundError.title')}</span>
        <p className='text-muted-foreground text-center'>
          {t('notFoundError.description')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            {t('goBack')}
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>
            {t('backToHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
