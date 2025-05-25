import { IconMailPlus, IconUserPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useUsers } from '../context/users-context'
import { useTranslation } from 'react-i18next'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()
  const { t } = useTranslation("users")

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('invite')}
      >
        <span>{t("invite")}</span> <IconMailPlus size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>{t("add")}</span> <IconUserPlus size={18} />
      </Button>
    </div>
  )
}
