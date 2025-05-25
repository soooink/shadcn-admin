import { IconDownload, IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useTasks } from '../context/tasks-context'
import { useTranslation } from 'react-i18next'

export function TasksPrimaryButtons() {
    const { t } = useTranslation("tasks")
  const { setOpen } = useTasks()
  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('import')}
      >
        <span>{t("import")}</span> <IconDownload size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>{t("create")}</span> <IconPlus size={18} />
      </Button>
    </div>
  )
}
