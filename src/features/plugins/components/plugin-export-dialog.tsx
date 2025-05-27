import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Download, Upload, Copy, Check } from 'lucide-react'

import { exportPluginConfig, importPluginConfig } from '../services/cloud-sync'
import { Plugin } from '@/types/plugin-types'

interface PluginExportDialogProps {
  isOpen: boolean
  onClose: () => void
  plugins: Plugin[]
  selectedPluginIds: string[]
  onExportSuccess: () => void
  onExportError: (error: string) => void
  onImportSuccess: () => void
  onImportError: (error: string) => void
}

export function PluginExportDialog({
  isOpen,
  onClose,
  plugins,
  selectedPluginIds,
  onExportSuccess,
  onExportError,
  onImportSuccess,
  onImportError
}: PluginExportDialogProps) {
  const { t } = useTranslation('plugins')
  const [mode, setMode] = useState<'export' | 'import'>('export')
  const [exportData, setExportData] = useState('')
  const [importData, setImportData] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  
  // 处理导出
  const handleExport = () => {
    try {
      const data = exportPluginConfig(selectedPluginIds.length > 0 ? selectedPluginIds : undefined)
      setExportData(data)
      onExportSuccess()
    } catch (error) {
      onExportError(t('exportFailed'))
    }
  }
  
  // 处理导入
  const handleImport = () => {
    try {
      if (!importData.trim()) {
        onImportError(t('noDataToImport'))
        return
      }
      
      const success = importPluginConfig(importData)
      if (success) {
        onImportSuccess()
        onClose()
      } else {
        onImportError(t('importFailed'))
      }
    } catch (error) {
      onImportError(t('importFailed'))
    }
  }
  
  // 复制到剪贴板
  const handleCopy = () => {
    navigator.clipboard.writeText(exportData)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
      .catch(() => {
        onExportError(t('copyFailed'))
      })
  }
  
  // 下载配置文件
  const handleDownload = () => {
    try {
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plugin-config.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      onExportError(t('downloadFailed'))
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'export' ? t('exportConfig') : t('importConfig')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'export' 
              ? t('exportConfigDescription') 
              : t('importConfigDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Button
              variant={mode === 'export' ? 'default' : 'outline'}
              onClick={() => setMode('export')}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('exportConfig')}
            </Button>
            <Button
              variant={mode === 'import' ? 'default' : 'outline'}
              onClick={() => setMode('import')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('importConfig')}
            </Button>
          </div>
          
          {mode === 'export' ? (
            <>
              <div className="mb-4">
                <Button onClick={handleExport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  {selectedPluginIds.length > 0 
                    ? t('exportSelectedPlugins', { count: selectedPluginIds.length }) 
                    : t('exportAllPlugins')}
                </Button>
              </div>
              
              {exportData && (
                <>
                  <Textarea
                    value={exportData}
                    readOnly
                    className="h-[200px] font-mono text-xs"
                  />
                  
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopy}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {t('copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          {t('copyToClipboard')}
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('downloadFile')}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <Textarea
                value={importData}
                onChange={e => setImportData(e.target.value)}
                placeholder={t('pasteConfigurationHere')}
                className="h-[200px] font-mono text-xs mb-4"
              />
              
              <Button 
                onClick={handleImport} 
                disabled={!importData.trim()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('importConfig')}
              </Button>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
