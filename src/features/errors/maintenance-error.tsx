import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export default function MaintenanceError() {
  const { t } = useTranslation('errors')
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>{t('maintenanceError.title')}</h1>
        <span className='font-medium'>{t('maintenanceError.title')}</span>
        <p className='text-muted-foreground text-center'>
          {t('maintenanceError.description')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline'>{t('goBack')}</Button>
        </div>
      </div>
    </div>
  )
}
