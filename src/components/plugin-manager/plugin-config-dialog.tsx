/**
 * 插件配置对话框组件
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { getPluginSystemIntegration } from '../../core/plugin-system-integration';

interface PluginConfigDialogProps {
  pluginId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PluginConfigDialog({ pluginId, isOpen, onClose }: PluginConfigDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configSchema, setConfigSchema] = useState<any>(null);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plugin, setPlugin] = useState<any>(null);

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const pluginSystem = getPluginSystemIntegration();
      const plugin = pluginSystem.getPlugin(pluginId);
      
      if (!plugin) {
        throw new Error(`插件 ${pluginId} 不存在`);
      }
      
      setPlugin(plugin);
      
      // 获取插件上下文
      const context = pluginSystem.getPluginContext(pluginId);
      
      if (!context) {
        throw new Error(`插件上下文 ${pluginId} 不存在`);
      }
      
      // 获取配置模式
      const schema = await context.config.getConfigSchema();
      setConfigSchema(schema);
      
      // 获取配置值
      const values = await context.config.getConfig();
      setConfigValues(values || {});
    } catch (error) {
      console.error(`加载插件配置失败 ${pluginId}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // 验证配置
      const validationErrors = validateConfig();
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      
      const pluginSystem = getPluginSystemIntegration();
      const context = pluginSystem.getPluginContext(pluginId);
      
      if (!context) {
        throw new Error(`插件上下文 ${pluginId} 不存在`);
      }
      
      // 保存配置
      await context.config.setConfig(configValues);
      
      // 关闭对话框
      onClose();
    } catch (error) {
      console.error(`保存插件配置失败 ${pluginId}:`, error);
      alert(t('plugins.config.saveError', '保存配置失败') + ': ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 验证配置
  const validateConfig = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!configSchema || !configSchema.fields) {
      return errors;
    }
    
    configSchema.fields.forEach((field: any) => {
      const value = configValues[field.id];
      
      // 必填字段
      if (field.required && (value === undefined || value === null || value === '')) {
        errors[field.id] = t('plugins.config.requiredField', '此字段是必填的');
        return;
      }
      
      // 字符串长度
      if (field.type === 'string' && typeof value === 'string') {
        if (field.minLength && value.length < field.minLength) {
          errors[field.id] = t(
            'plugins.config.minLength', 
            '最小长度为 {{length}} 个字符', 
            { length: field.minLength }
          );
        } else if (field.maxLength && value.length > field.maxLength) {
          errors[field.id] = t(
            'plugins.config.maxLength', 
            '最大长度为 {{length}} 个字符', 
            { length: field.maxLength }
          );
        }
      }
      
      // 数字范围
      if (field.type === 'number' && typeof value === 'number') {
        if (field.min !== undefined && value < field.min) {
          errors[field.id] = t(
            'plugins.config.minValue', 
            '最小值为 {{value}}', 
            { value: field.min }
          );
        } else if (field.max !== undefined && value > field.max) {
          errors[field.id] = t(
            'plugins.config.maxValue', 
            '最大值为 {{value}}', 
            { value: field.max }
          );
        }
      }
    });
    
    return errors;
  };

  // 处理字段值变更
  const handleFieldChange = (fieldId: string, value: any) => {
    setConfigValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // 清除错误
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // 渲染配置字段
  const renderField = (field: any) => {
    const value = configValues[field.id];
    const error = errors[field.id];
    
    switch (field.type) {
      case 'string':
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
        
      case 'text':
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
              rows={field.rows || 4}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
        
      case 'number':
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={value !== undefined ? value : ''}
              onChange={(e) => handleFieldChange(field.id, e.target.valueAsNumber)}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
              min={field.min}
              max={field.max}
              step={field.step || 1}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
        
      case 'boolean':
        return (
          <div className="flex items-center justify-between space-y-0 py-2" key={field.id}>
            <div className="space-y-0.5">
              <Label htmlFor={field.id}>{field.label}</Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
            <Switch
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(val) => handleFieldChange(field.id, val)}
            >
              <SelectTrigger id={field.id} className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-2" key={field.id}>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.id}
                checked={value || false}
                onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              />
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
        
      default:
        return null;
    }
  };

  // 初始加载
  useEffect(() => {
    if (isOpen && pluginId) {
      loadConfig();
    }
  }, [isOpen, pluginId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">{t('plugins.config.loading', '加载中...')}</span>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('plugins.config.title', '{{pluginName}} 配置', { pluginName: plugin?.name })}
              </DialogTitle>
              <DialogDescription>
                {t('plugins.config.description', '调整插件设置以满足您的需求')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {configSchema && configSchema.fields ? (
                configSchema.fields.map((field: any) => renderField(field))
              ) : (
                <p className="text-center text-muted-foreground">
                  {t('plugins.config.noConfig', '此插件没有可配置的选项')}
                </p>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="default"
                disabled={saving || !configSchema || !configSchema.fields}
                onClick={handleSave}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t('plugins.config.save', '保存')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
