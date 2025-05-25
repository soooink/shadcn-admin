'use client'

import { useState } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { User } from '../data/schema'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({ open, onOpenChange, currentRow }: Props) {
  const [value, setValue] = useState('')

  const { t } = useTranslation("users")

  const handleDelete = () => {
    if (value.trim() !== currentRow.username) return

    onOpenChange(false)
    showSubmittedData(currentRow, 'The following user has been deleted:')
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.username}
      title={
        <span className='text-destructive'>
          <IconAlertTriangle
            className='stroke-destructive mr-1 inline-block'
            size={18}
          />{' '}
          {t("delete")}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            {t("deleteDescription")}
            <span className='font-bold'>{currentRow.username}</span>?
            <br />
            {t("deleteDescription2")}
            <span className='font-bold'>
              {currentRow.role.toUpperCase()}
            </span>{' '}
            {t("deleteDescription3")}
          </p>

          <Label className='my-2'>
            {t("username")}:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("usernamePlaceholder")}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t("warning")}</AlertTitle>
            <AlertDescription>
              {t("deleteWarning")}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t("delete")}
      destructive
    />
  )
}
