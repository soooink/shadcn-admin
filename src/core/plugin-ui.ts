/**
 * 插件UI集成系统
 * 提供插件UI组件的注册和渲染功能
 */
import React from 'react';
import { Plugin } from './plugin-system';
import { getPluginSandboxManager } from './plugin-sandbox';

/**
 * UI插槽类型
 */
export enum UISlotType {
  /** 侧边栏 */
  SIDEBAR = 'sidebar',
  /** 顶部导航 */
  NAVBAR = 'navbar',
  /** 设置面板 */
  SETTINGS = 'settings',
  /** 主工作区 */
  WORKSPACE = 'workspace',
  /** 右侧面板 */
  RIGHT_PANEL = 'right_panel',
  /** 底部面板 */
  BOTTOM_PANEL = 'bottom_panel',
  /** 模态框 */
  MODAL = 'modal',
  /** 上下文菜单 */
  CONTEXT_MENU = 'context_menu',
  /** 悬浮面板 */
  FLOATING_PANEL = 'floating_panel',
  /** 全局覆盖 */
  OVERLAY = 'overlay'
}

/**
 * UI组件类型
 */
export enum UIComponentType {
  /** 按钮 */
  BUTTON = 'button',
  /** 菜单项 */
  MENU_ITEM = 'menu_item',
  /** 面板 */
  PANEL = 'panel',
  /** 表单 */
  FORM = 'form',
  /** 卡片 */
  CARD = 'card',
  /** 图标 */
  ICON = 'icon',
  /** 标签页 */
  TAB = 'tab',
  /** 列表项 */
  LIST_ITEM = 'list_item',
  /** 自定义组件 */
  CUSTOM = 'custom'
}

/**
 * UI组件定义
 */
export interface UIComponentDefinition {
  /** 组件ID */
  id: string;
  /** 组件类型 */
  type: UIComponentType;
  /** 组件标题 */
  title: string;
  /** 组件描述 */
  description?: string;
  /** 图标（可以是URL或图标名称） */
  icon?: string;
  /** 插槽类型 */
  slotType: UISlotType;
  /** 显示顺序 */
  order?: number;
  /** 是否默认显示 */
  defaultVisible?: boolean;
  /** 是否可移动 */
  movable?: boolean;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 初始位置（对于可移动组件） */
  initialPosition?: {
    x: number;
    y: number;
  };
  /** 初始大小（对于可调整大小的组件） */
  initialSize?: {
    width: number;
    height: number;
  };
  /** 权限要求 */
  permissions?: string[];
  /** 条件显示（基于上下文） */
  showIf?: (context: Record<string, unknown>) => boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * UI组件实例
 */
export interface UIComponentInstance extends UIComponentDefinition {
  /** 提供者插件ID */
  pluginId: string;
  /** 渲染函数 */
  render: (props: UIComponentProps) => React.ReactNode;
  /** 是否已挂载 */
  mounted: boolean;
  /** 挂载时间 */
  mountedAt?: number;
  /** 是否可见 */
  visible: boolean;
}

/**
 * UI组件属性
 */
export interface UIComponentProps {
  /** 组件ID */
  id: string;
  /** 插件ID */
  pluginId: string;
  /** 上下文数据 */
  context?: Record<string, unknown>;
  /** 是否可见 */
  visible: boolean;
  /** 设置可见性 */
  setVisible: (visible: boolean) => void;
  /** 样式 */
  style?: React.CSSProperties;
  /** 类名 */
  className?: string;
  /** 事件处理器 */
  onEvent?: (eventName: string, data?: unknown) => void;
}

/**
 * UI事件类型
 */
export enum UIEventType {
  /** 组件注册 */
  COMPONENT_REGISTERED = 'ui:component_registered',
  /** 组件注销 */
  COMPONENT_UNREGISTERED = 'ui:component_unregistered',
  /** 组件挂载 */
  COMPONENT_MOUNTED = 'ui:component_mounted',
  /** 组件卸载 */
  COMPONENT_UNMOUNTED = 'ui:component_unmounted',
  /** 组件显示 */
  COMPONENT_SHOWN = 'ui:component_shown',
  /** 组件隐藏 */
  COMPONENT_HIDDEN = 'ui:component_hidden',
  /** 组件移动 */
  COMPONENT_MOVED = 'ui:component_moved',
  /** 组件调整大小 */
  COMPONENT_RESIZED = 'ui:component_resized',
  /** 组件点击 */
  COMPONENT_CLICKED = 'ui:component_clicked'
}

/**
 * UI事件
 */
export interface UIEvent {
  /** 事件类型 */
  type: UIEventType;
  /** 组件ID */
  componentId: string;
  /** 插件ID */
  pluginId: string;
  /** 时间戳 */
  timestamp: number;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * UI事件监听器
 */
export type UIEventListener = (event: UIEvent) => void;

/**
 * 插件UI管理器
 */
export class PluginUIManager {
  private plugins: Map<string, Plugin> = new Map();
  private components: Map<string, UIComponentInstance> = new Map();
  private slotComponents: Map<UISlotType, Set<string>> = new Map();
  private eventListeners: Map<UIEventType, UIEventListener[]> = new Map();
  
  /**
   * 构造函数
   */
  constructor() {
    // 初始化插槽映射
    Object.values(UISlotType).forEach(slotType => {
      this.slotComponents.set(slotType, new Set());
    });
    
    // 监听沙箱事件
    const sandboxManager = getPluginSandboxManager();
    sandboxManager.addEventListener('destroyed', (event) => {
      this.unregisterPluginComponents(event.pluginId);
    });
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.unregisterPluginComponents(pluginId);
  }
  
  /**
   * 注销插件组件
   * @param pluginId 插件ID
   */
  private unregisterPluginComponents(pluginId: string): void {
    // 查找插件的所有组件
    const componentIds: string[] = [];
    
    this.components.forEach((component, id) => {
      if (component.pluginId === pluginId) {
        componentIds.push(id);
      }
    });
    
    // 注销所有组件
    componentIds.forEach(id => {
      this.unregisterComponent(id);
    });
  }
  
  /**
   * 注册UI组件
   * @param pluginId 插件ID
   * @param definition 组件定义
   * @param renderFn 渲染函数
   * @returns 是否成功
   */
  registerComponent(
    pluginId: string,
    definition: UIComponentDefinition,
    renderFn: (props: UIComponentProps) => React.ReactNode
  ): boolean {
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin UI] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    // 检查组件ID是否已存在
    const componentId = `${pluginId}:${definition.id}`;
    if (this.components.has(componentId)) {
      console.error(`[Plugin UI] Component ${componentId} is already registered`);
      return false;
    }
    
    // 创建组件实例
    const component: UIComponentInstance = {
      ...definition,
      pluginId,
      id: componentId,
      render: renderFn,
      mounted: false,
      visible: definition.defaultVisible || false,
      enabled: definition.enabled !== undefined ? definition.enabled : true
    };
    
    // 保存组件
    this.components.set(componentId, component);
    
    // 添加到插槽映射
    const slotComponents = this.slotComponents.get(definition.slotType);
    if (slotComponents) {
      slotComponents.add(componentId);
    }
    
    // 分发组件注册事件
    this.dispatchEvent({
      type: UIEventType.COMPONENT_REGISTERED,
      componentId,
      pluginId,
      timestamp: Date.now(),
      details: {
        type: definition.type,
        slotType: definition.slotType
      }
    });
    
    return true;
  }
  
  /**
   * 注销UI组件
   * @param componentId 组件ID
   * @returns 是否成功
   */
  unregisterComponent(componentId: string): boolean {
    const component = this.components.get(componentId);
    if (!component) {
      return false;
    }
    
    // 从插槽映射中移除
    const slotComponents = this.slotComponents.get(component.slotType);
    if (slotComponents) {
      slotComponents.delete(componentId);
    }
    
    // 移除组件
    this.components.delete(componentId);
    
    // 分发组件注销事件
    this.dispatchEvent({
      type: UIEventType.COMPONENT_UNREGISTERED,
      componentId,
      pluginId: component.pluginId,
      timestamp: Date.now(),
      details: {
        type: component.type,
        slotType: component.slotType
      }
    });
    
    return true;
  }
  
  /**
   * 获取组件
   * @param componentId 组件ID
   * @returns 组件实例
   */
  getComponent(componentId: string): UIComponentInstance | undefined {
    return this.components.get(componentId);
  }
  
  /**
   * 获取插槽组件
   * @param slotType 插槽类型
   * @returns 组件实例列表
   */
  getSlotComponents(slotType: UISlotType): UIComponentInstance[] {
    const componentIds = this.slotComponents.get(slotType) || new Set();
    const components: UIComponentInstance[] = [];
    
    componentIds.forEach(id => {
      const component = this.components.get(id);
      if (component && component.enabled) {
        components.push(component);
      }
    });
    
    // 按顺序排序
    return components.sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      return orderA - orderB;
    });
  }
  
  /**
   * 获取插件组件
   * @param pluginId 插件ID
   * @returns 组件实例列表
   */
  getPluginComponents(pluginId: string): UIComponentInstance[] {
    const components: UIComponentInstance[] = [];
    
    this.components.forEach(component => {
      if (component.pluginId === pluginId) {
        components.push(component);
      }
    });
    
    return components;
  }
  
  /**
   * 设置组件挂载状态
   * @param componentId 组件ID
   * @param mounted 是否挂载
   * @returns 是否成功
   */
  setComponentMounted(componentId: string, mounted: boolean): boolean {
    const component = this.components.get(componentId);
    if (!component) {
      return false;
    }
    
    // 更新挂载状态
    component.mounted = mounted;
    
    if (mounted) {
      component.mountedAt = Date.now();
      
      // 分发组件挂载事件
      this.dispatchEvent({
        type: UIEventType.COMPONENT_MOUNTED,
        componentId,
        pluginId: component.pluginId,
        timestamp: Date.now()
      });
    } else {
      // 分发组件卸载事件
      this.dispatchEvent({
        type: UIEventType.COMPONENT_UNMOUNTED,
        componentId,
        pluginId: component.pluginId,
        timestamp: Date.now()
      });
    }
    
    return true;
  }
  
  /**
   * 设置组件可见性
   * @param componentId 组件ID
   * @param visible 是否可见
   * @returns 是否成功
   */
  setComponentVisible(componentId: string, visible: boolean): boolean {
    const component = this.components.get(componentId);
    if (!component) {
      return false;
    }
    
    // 更新可见性
    component.visible = visible;
    
    // 分发组件显示/隐藏事件
    this.dispatchEvent({
      type: visible ? UIEventType.COMPONENT_SHOWN : UIEventType.COMPONENT_HIDDEN,
      componentId,
      pluginId: component.pluginId,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * 设置组件位置
   * @param componentId 组件ID
   * @param position 位置
   * @returns 是否成功
   */
  setComponentPosition(
    componentId: string,
    position: { x: number; y: number }
  ): boolean {
    const component = this.components.get(componentId);
    if (!component || !component.movable) {
      return false;
    }
    
    // 更新位置
    component.initialPosition = position;
    
    // 分发组件移动事件
    this.dispatchEvent({
      type: UIEventType.COMPONENT_MOVED,
      componentId,
      pluginId: component.pluginId,
      timestamp: Date.now(),
      details: {
        position
      }
    });
    
    return true;
  }
  
  /**
   * 设置组件大小
   * @param componentId 组件ID
   * @param size 大小
   * @returns 是否成功
   */
  setComponentSize(
    componentId: string,
    size: { width: number; height: number }
  ): boolean {
    const component = this.components.get(componentId);
    if (!component || !component.resizable) {
      return false;
    }
    
    // 更新大小
    component.initialSize = size;
    
    // 分发组件调整大小事件
    this.dispatchEvent({
      type: UIEventType.COMPONENT_RESIZED,
      componentId,
      pluginId: component.pluginId,
      timestamp: Date.now(),
      details: {
        size
      }
    });
    
    return true;
  }
  
  /**
   * 设置组件启用状态
   * @param componentId 组件ID
   * @param enabled 是否启用
   * @returns 是否成功
   */
  setComponentEnabled(componentId: string, enabled: boolean): boolean {
    const component = this.components.get(componentId);
    if (!component) {
      return false;
    }
    
    // 更新启用状态
    component.enabled = enabled;
    
    return true;
  }
  
  /**
   * 触发组件点击事件
   * @param componentId 组件ID
   * @param data 事件数据
   */
  triggerComponentClick(componentId: string, data?: unknown): void {
    const component = this.components.get(componentId);
    if (!component) {
      return;
    }
    
    // 分发组件点击事件
    this.dispatchEvent({
      type: UIEventType.COMPONENT_CLICKED,
      componentId,
      pluginId: component.pluginId,
      timestamp: Date.now(),
      details: {
        data
      }
    });
  }
  
  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  addEventListener(type: UIEventType, listener: UIEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    
    this.eventListeners.get(type)?.push(listener);
  }
  
  /**
   * 移除事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  removeEventListener(type: UIEventType, listener: UIEventListener): void {
    const listeners = this.eventListeners.get(type);
    if (!listeners) {
      return;
    }
    
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * 分发事件
   * @param event 事件对象
   */
  private dispatchEvent(event: UIEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in UI event listener:', error);
      }
    }
  }
}

// 创建插件UI管理器实例
let uiManagerInstance: PluginUIManager | null = null;

/**
 * 获取插件UI管理器实例
 * @returns 插件UI管理器实例
 */
export function getPluginUIManager(): PluginUIManager {
  if (!uiManagerInstance) {
    uiManagerInstance = new PluginUIManager();
  }
  return uiManagerInstance;
}

/**
 * 创建插件UI助手
 * @param pluginId 插件ID
 * @returns UI助手
 */
export function createPluginUIHelper(pluginId: string) {
  const manager = getPluginUIManager();
  
  return {
    /**
     * 注册组件
     * @param definition 组件定义
     * @param renderFn 渲染函数
     * @returns 是否成功
     */
    registerComponent: (
      definition: Omit<UIComponentDefinition, 'id'> & { id?: string },
      renderFn: (props: UIComponentProps) => React.ReactNode
    ) => {
      // 生成组件ID（如果未提供）
      const id = definition.id || `${definition.type}_${Date.now()}`;
      
      return manager.registerComponent(
        pluginId,
        { ...definition, id } as UIComponentDefinition,
        renderFn
      );
    },
    
    /**
     * 注销组件
     * @param componentId 组件ID
     * @returns 是否成功
     */
    unregisterComponent: (componentId: string) => 
      manager.unregisterComponent(`${pluginId}:${componentId}`),
    
    /**
     * 获取组件
     * @param componentId 组件ID
     * @returns 组件实例
     */
    getComponent: (componentId: string) => 
      manager.getComponent(`${pluginId}:${componentId}`),
    
    /**
     * 获取插件的所有组件
     * @returns 组件实例列表
     */
    getAllComponents: () => manager.getPluginComponents(pluginId),
    
    /**
     * 设置组件可见性
     * @param componentId 组件ID
     * @param visible 是否可见
     * @returns 是否成功
     */
    setComponentVisible: (componentId: string, visible: boolean) => 
      manager.setComponentVisible(`${pluginId}:${componentId}`, visible),
    
    /**
     * 设置组件位置
     * @param componentId 组件ID
     * @param position 位置
     * @returns 是否成功
     */
    setComponentPosition: (componentId: string, position: { x: number; y: number }) => 
      manager.setComponentPosition(`${pluginId}:${componentId}`, position),
    
    /**
     * 设置组件大小
     * @param componentId 组件ID
     * @param size 大小
     * @returns 是否成功
     */
    setComponentSize: (componentId: string, size: { width: number; height: number }) => 
      manager.setComponentSize(`${pluginId}:${componentId}`, size),
    
    /**
     * 设置组件启用状态
     * @param componentId 组件ID
     * @param enabled 是否启用
     * @returns 是否成功
     */
    setComponentEnabled: (componentId: string, enabled: boolean) => 
      manager.setComponentEnabled(`${pluginId}:${componentId}`, enabled),
    
    /**
     * 触发组件点击事件
     * @param componentId 组件ID
     * @param data 事件数据
     */
    triggerComponentClick: (componentId: string, data?: unknown) => 
      manager.triggerComponentClick(`${pluginId}:${componentId}`, data),
    
    /**
     * 添加事件监听器
     * @param type 事件类型
     * @param listener 监听器函数
     */
    addEventListener: (type: UIEventType, listener: (event: UIEvent) => void) => {
      const wrappedListener = (event: UIEvent) => {
        // 只监听与该插件相关的事件
        if (event.pluginId === pluginId || event.componentId.startsWith(`${pluginId}:`)) {
          listener(event);
        }
      };
      
      manager.addEventListener(type, wrappedListener);
      
      // 返回移除监听器的函数
      return () => {
        manager.removeEventListener(type, wrappedListener);
      };
    }
  };
}

/**
 * 插件UI组件
 * 用于渲染插件提供的UI组件
 */
export const PluginUIComponent: React.FC<{
  componentId: string;
  context?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
}> = ({ componentId, context, className, style }) => {
  const manager = getPluginUIManager();
  const component = manager.getComponent(componentId);
  
  React.useEffect(() => {
    if (component) {
      // 设置组件挂载状态
      manager.setComponentMounted(componentId, true);
      
      return () => {
        // 设置组件卸载状态
        manager.setComponentMounted(componentId, false);
      };
    }
  }, [componentId, component]);
  
  if (!component || !component.enabled) {
    return null;
  }
  
  // 检查条件显示
  if (component.showIf && !component.showIf(context || {})) {
    return null;
  }
  
  // 创建组件属性
  const props: UIComponentProps = {
    id: component.id,
    pluginId: component.pluginId,
    context,
    visible: component.visible,
    setVisible: (visible) => {
      manager.setComponentVisible(componentId, visible);
    },
    style: {
      ...component.style,
      ...style
    },
    className: [component.className, className].filter(Boolean).join(' '),
    onEvent: (eventName, data) => {
      // 可以在这里处理组件事件
      console.log(`[Plugin UI] Event ${eventName} from ${componentId}:`, data);
    }
  };
  
  // 渲染组件
  return <React.Fragment>{component.render(props)}</React.Fragment>;
};

/**
 * 插件UI插槽
 * 用于渲染指定插槽的所有插件组件
 */
export const PluginUISlot: React.FC<{
  slotType: UISlotType;
  context?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
  filter?: (component: UIComponentInstance) => boolean;
}> = ({ slotType, context, className, style, filter }) => {
  const manager = getPluginUIManager();
  const components = manager.getSlotComponents(slotType);
  
  // 过滤组件
  const filteredComponents = filter ? components.filter(filter) : components;
  
  return (
    <div className={className} style={style}>
      {filteredComponents.map(component => (
        <PluginUIComponent
          key={component.id}
          componentId={component.id}
          context={context}
        />
      ))}
    </div>
  );
};
