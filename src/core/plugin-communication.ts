/**
 * 插件通信系统
 * 提供插件之间安全通信的机制，支持事件广播、消息传递和服务注册
 */
import { Plugin } from './plugin-system';
import { SandboxEventType, getPluginSandboxManager } from './plugin-sandbox';

/**
 * 消息类型
 */
export enum MessageType {
  /** 请求 */
  REQUEST = 'request',
  /** 响应 */
  RESPONSE = 'response',
  /** 事件 */
  EVENT = 'event',
  /** 错误 */
  ERROR = 'error'
}

/**
 * 插件消息
 */
export interface PluginMessage {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: MessageType;
  /** 发送者插件ID */
  senderId: string;
  /** 接收者插件ID（如果为空则为广播消息） */
  receiverId?: string;
  /** 频道（用于分类消息） */
  channel: string;
  /** 动作（具体操作） */
  action: string;
  /** 数据 */
  data?: unknown;
  /** 时间戳 */
  timestamp: number;
  /** 是否需要响应 */
  requiresResponse?: boolean;
  /** 响应超时（毫秒） */
  responseTimeout?: number;
  /** 关联的请求ID（用于响应） */
  requestId?: string;
}

/**
 * 消息处理器
 */
export type MessageHandler = (
  message: PluginMessage,
  respond: (data: unknown) => Promise<void>
) => Promise<void> | void;

/**
 * 服务定义
 */
export interface ServiceDefinition {
  /** 服务ID */
  id: string;
  /** 服务名称 */
  name: string;
  /** 服务描述 */
  description: string;
  /** 提供者插件ID */
  providerId: string;
  /** 方法列表 */
  methods: Array<{
    /** 方法名 */
    name: string;
    /** 方法描述 */
    description: string;
    /** 参数描述 */
    params?: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
    /** 返回值描述 */
    returns?: {
      type: string;
      description: string;
    };
  }>;
  /** 是否公开（允许所有插件访问） */
  public: boolean;
  /** 允许访问的插件ID列表（如果不是公开的） */
  allowedPlugins?: string[];
}

/**
 * 插件通信管理器
 */
export class PluginCommunicationManager {
  private plugins: Map<string, Plugin> = new Map();
  private messageHandlers: Map<string, Map<string, MessageHandler>> = new Map();
  private services: Map<string, ServiceDefinition> = new Map();
  private pendingRequests: Map<string, {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  /**
   * 构造函数
   */
  constructor() {
    // 监听沙箱事件
    const sandboxManager = getPluginSandboxManager();
    sandboxManager.addEventListener(SandboxEventType.DESTROYED, (event) => {
      this.unregisterPlugin(event.pluginId);
    });
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    this.messageHandlers.set(plugin.id, new Map());
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    // 移除插件的消息处理器
    this.messageHandlers.delete(pluginId);
    
    // 移除插件注册的服务
    const servicesToRemove: string[] = [];
    this.services.forEach((service, serviceId) => {
      if (service.providerId === pluginId) {
        servicesToRemove.push(serviceId);
      }
    });
    
    servicesToRemove.forEach(serviceId => {
      this.services.delete(serviceId);
    });
    
    // 拒绝所有来自该插件的待处理请求
    const requestsToReject: string[] = [];
    this.pendingRequests.forEach((_, requestId) => {
      if (requestId.startsWith(`${pluginId}:`)) {
        requestsToReject.push(requestId);
      }
    });
    
    requestsToReject.forEach(requestId => {
      const pendingRequest = this.pendingRequests.get(requestId);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        pendingRequest.reject(new Error(`Plugin ${pluginId} has been unregistered`));
        this.pendingRequests.delete(requestId);
      }
    });
    
    // 移除插件
    this.plugins.delete(pluginId);
  }
  
  /**
   * 注册消息处理器
   * @param pluginId 插件ID
   * @param channel 频道
   * @param handler 处理器函数
   */
  registerMessageHandler(
    pluginId: string,
    channel: string,
    handler: MessageHandler
  ): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    const handlers = this.messageHandlers.get(pluginId);
    if (!handlers) {
      throw new Error(`Message handlers for plugin ${pluginId} not initialized`);
    }
    
    handlers.set(channel, handler);
  }
  
  /**
   * 注销消息处理器
   * @param pluginId 插件ID
   * @param channel 频道
   */
  unregisterMessageHandler(pluginId: string, channel: string): void {
    const handlers = this.messageHandlers.get(pluginId);
    if (handlers) {
      handlers.delete(channel);
    }
  }
  
  /**
   * 发送消息
   * @param message 消息对象
   * @returns 响应数据（如果需要响应）
   */
  async sendMessage(message: Omit<PluginMessage, 'id' | 'timestamp'>): Promise<unknown> {
    const senderId = message.senderId;
    
    if (!this.plugins.has(senderId)) {
      throw new Error(`Sender plugin ${senderId} is not registered`);
    }
    
    // 生成消息ID和时间戳
    const id = `${senderId}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();
    
    const fullMessage: PluginMessage = {
      ...message,
      id,
      timestamp
    };
    
    // 如果是广播消息
    if (!message.receiverId) {
      await this.broadcastMessage(fullMessage);
      return undefined;
    }
    
    // 如果是定向消息
    const receiverId = message.receiverId;
    
    if (!this.plugins.has(receiverId)) {
      throw new Error(`Receiver plugin ${receiverId} is not registered`);
    }
    
    // 如果需要响应
    if (message.requiresResponse) {
      return this.sendRequestMessage(fullMessage);
    }
    
    // 如果不需要响应
    await this.deliverMessage(fullMessage);
    return undefined;
  }
  
  /**
   * 广播消息
   * @param message 消息对象
   */
  private async broadcastMessage(message: PluginMessage): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const pluginId of this.plugins.keys()) {
      // 不向发送者广播
      if (pluginId === message.senderId) {
        continue;
      }
      
      const broadcastMessage: PluginMessage = {
        ...message,
        receiverId: pluginId
      };
      
      promises.push(this.deliverMessage(broadcastMessage).catch(error => {
        console.error(`Error delivering broadcast message to ${pluginId}:`, error);
      }));
    }
    
    await Promise.all(promises);
  }
  
  /**
   * 发送请求消息
   * @param message 消息对象
   * @returns 响应数据
   */
  private sendRequestMessage(message: PluginMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timed out after ${message.responseTimeout || 30000}ms`));
      }, message.responseTimeout || 30000);
      
      this.pendingRequests.set(message.id, { resolve, reject, timeout });
      
      this.deliverMessage(message).catch(error => {
        clearTimeout(timeout);
        this.pendingRequests.delete(message.id);
        reject(error);
      });
    });
  }
  
  /**
   * 发送响应消息
   * @param requestMessage 请求消息
   * @param data 响应数据
   */
  private async sendResponseMessage(
    requestMessage: PluginMessage,
    data: unknown
  ): Promise<void> {
    if (!requestMessage.senderId) {
      throw new Error('Request message has no sender ID');
    }
    
    const responseMessage: PluginMessage = {
      id: `response:${requestMessage.id}`,
      type: MessageType.RESPONSE,
      senderId: requestMessage.receiverId!,
      receiverId: requestMessage.senderId,
      channel: requestMessage.channel,
      action: requestMessage.action,
      data,
      timestamp: Date.now(),
      requestId: requestMessage.id
    };
    
    await this.deliverMessage(responseMessage);
  }
  
  /**
   * 投递消息
   * @param message 消息对象
   */
  private async deliverMessage(message: PluginMessage): Promise<void> {
    const receiverId = message.receiverId;
    if (!receiverId) {
      throw new Error('Message has no receiver ID');
    }
    
    const handlers = this.messageHandlers.get(receiverId);
    if (!handlers) {
      throw new Error(`No message handlers registered for plugin ${receiverId}`);
    }
    
    const handler = handlers.get(message.channel);
    if (!handler) {
      throw new Error(`No handler registered for channel ${message.channel} in plugin ${receiverId}`);
    }
    
    // 创建响应函数
    const respond = async (data: unknown): Promise<void> => {
      if (message.type === MessageType.REQUEST) {
        await this.sendResponseMessage(message, data);
        
        // 解决待处理的请求
        const pendingRequest = this.pendingRequests.get(message.id);
        if (pendingRequest) {
          clearTimeout(pendingRequest.timeout);
          pendingRequest.resolve(data);
          this.pendingRequests.delete(message.id);
        }
      }
    };
    
    // 调用处理器
    try {
      await handler(message, respond);
    } catch (error) {
      // 如果是请求消息，发送错误响应
      if (message.type === MessageType.REQUEST) {
        const errorMessage: PluginMessage = {
          id: `error:${message.id}`,
          type: MessageType.ERROR,
          senderId: receiverId,
          receiverId: message.senderId,
          channel: message.channel,
          action: message.action,
          data: {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          },
          timestamp: Date.now(),
          requestId: message.id
        };
        
        await this.deliverMessage(errorMessage).catch(e => {
          console.error('Error delivering error message:', e);
        });
        
        // 拒绝待处理的请求
        const pendingRequest = this.pendingRequests.get(message.id);
        if (pendingRequest) {
          clearTimeout(pendingRequest.timeout);
          pendingRequest.reject(error instanceof Error ? error : new Error(String(error)));
          this.pendingRequests.delete(message.id);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * 注册服务
   * @param pluginId 插件ID
   * @param service 服务定义
   * @returns 是否成功
   */
  registerService(pluginId: string, service: Omit<ServiceDefinition, 'providerId'>): boolean {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    // 检查服务ID是否已存在
    if (this.services.has(service.id)) {
      return false;
    }
    
    const fullService: ServiceDefinition = {
      ...service,
      providerId: pluginId
    };
    
    this.services.set(service.id, fullService);
    
    // 注册服务消息处理器
    this.registerMessageHandler(pluginId, `service:${service.id}`, async (message, respond) => {
      const { action, data } = message;
      
      // 检查方法是否存在
      const method = fullService.methods.find(m => m.name === action);
      if (!method) {
        throw new Error(`Method ${action} not found in service ${service.id}`);
      }
      
      // 检查访问权限
      if (!fullService.public && fullService.allowedPlugins) {
        if (!fullService.allowedPlugins.includes(message.senderId)) {
          throw new Error(`Plugin ${message.senderId} is not allowed to access service ${service.id}`);
        }
      }
      
      // 调用服务方法（实际实现需要插件提供）
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Provider plugin ${pluginId} not found`);
      }
      
      // 这里假设插件有一个onServiceRequest方法来处理服务请求
      // 实际实现可能需要更复杂的机制
      if (typeof (plugin as any).onServiceRequest === 'function') {
        const result = await (plugin as any).onServiceRequest(service.id, action, data);
        await respond(result);
      } else {
        throw new Error(`Plugin ${pluginId} does not implement onServiceRequest`);
      }
    });
    
    return true;
  }
  
  /**
   * 注销服务
   * @param serviceId 服务ID
   * @returns 是否成功
   */
  unregisterService(serviceId: string): boolean {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }
    
    // 注销服务消息处理器
    this.unregisterMessageHandler(service.providerId, `service:${serviceId}`);
    
    // 移除服务
    this.services.delete(serviceId);
    
    return true;
  }
  
  /**
   * 获取服务
   * @param serviceId 服务ID
   * @returns 服务定义
   */
  getService(serviceId: string): ServiceDefinition | undefined {
    return this.services.get(serviceId);
  }
  
  /**
   * 获取所有服务
   * @param pluginId 请求者插件ID（用于权限检查）
   * @returns 服务列表
   */
  getAllServices(pluginId: string): ServiceDefinition[] {
    const result: ServiceDefinition[] = [];
    
    this.services.forEach(service => {
      // 检查访问权限
      if (service.public || service.providerId === pluginId || 
          (service.allowedPlugins && service.allowedPlugins.includes(pluginId))) {
        result.push(service);
      }
    });
    
    return result;
  }
  
  /**
   * 调用服务方法
   * @param callerPluginId 调用者插件ID
   * @param serviceId 服务ID
   * @param method 方法名
   * @param params 参数
   * @returns 方法返回值
   */
  async callServiceMethod(
    callerPluginId: string,
    serviceId: string,
    method: string,
    params?: unknown
  ): Promise<unknown> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }
    
    // 检查访问权限
    if (!service.public && service.providerId !== callerPluginId) {
      if (!service.allowedPlugins || !service.allowedPlugins.includes(callerPluginId)) {
        throw new Error(`Plugin ${callerPluginId} is not allowed to access service ${serviceId}`);
      }
    }
    
    // 检查方法是否存在
    const methodDef = service.methods.find(m => m.name === method);
    if (!methodDef) {
      throw new Error(`Method ${method} not found in service ${serviceId}`);
    }
    
    // 发送服务请求消息
    return this.sendMessage({
      type: MessageType.REQUEST,
      senderId: callerPluginId,
      receiverId: service.providerId,
      channel: `service:${serviceId}`,
      action: method,
      data: params,
      requiresResponse: true,
      responseTimeout: 30000
    });
  }
}

// 创建插件通信管理器实例
let communicationManagerInstance: PluginCommunicationManager | null = null;

/**
 * 获取插件通信管理器实例
 * @returns 插件通信管理器实例
 */
export function getPluginCommunicationManager(): PluginCommunicationManager {
  if (!communicationManagerInstance) {
    communicationManagerInstance = new PluginCommunicationManager();
  }
  return communicationManagerInstance;
}

/**
 * 创建插件通信客户端
 * @param pluginId 插件ID
 * @returns 通信客户端
 */
export function createPluginCommunicationClient(pluginId: string) {
  const manager = getPluginCommunicationManager();
  
  return {
    /**
     * 发送消息
     * @param channel 频道
     * @param action 动作
     * @param data 数据
     * @param receiverId 接收者插件ID（如果为空则为广播消息）
     * @returns 响应数据（如果需要响应）
     */
    sendMessage: async (
      channel: string,
      action: string,
      data?: unknown,
      receiverId?: string
    ): Promise<unknown> => {
      return manager.sendMessage({
        type: MessageType.EVENT,
        senderId: pluginId,
        receiverId,
        channel,
        action,
        data
      });
    },
    
    /**
     * 发送请求
     * @param channel 频道
     * @param action 动作
     * @param data 数据
     * @param receiverId 接收者插件ID
     * @param timeout 超时时间（毫秒）
     * @returns 响应数据
     */
    sendRequest: async (
      channel: string,
      action: string,
      data?: unknown,
      receiverId?: string,
      timeout?: number
    ): Promise<unknown> => {
      return manager.sendMessage({
        type: MessageType.REQUEST,
        senderId: pluginId,
        receiverId,
        channel,
        action,
        data,
        requiresResponse: true,
        responseTimeout: timeout
      });
    },
    
    /**
     * 注册消息处理器
     * @param channel 频道
     * @param handler 处理器函数
     */
    onMessage: (
      channel: string,
      handler: (message: PluginMessage, respond: (data: unknown) => Promise<void>) => void
    ): void => {
      manager.registerMessageHandler(pluginId, channel, handler);
    },
    
    /**
     * 注销消息处理器
     * @param channel 频道
     */
    offMessage: (channel: string): void => {
      manager.unregisterMessageHandler(pluginId, channel);
    },
    
    /**
     * 注册服务
     * @param service 服务定义
     * @returns 是否成功
     */
    registerService: (
      service: Omit<ServiceDefinition, 'providerId'>
    ): boolean => {
      return manager.registerService(pluginId, service);
    },
    
    /**
     * 注销服务
     * @param serviceId 服务ID
     * @returns 是否成功
     */
    unregisterService: (serviceId: string): boolean => {
      return manager.unregisterService(serviceId);
    },
    
    /**
     * 获取服务
     * @param serviceId 服务ID
     * @returns 服务定义
     */
    getService: (serviceId: string): ServiceDefinition | undefined => {
      return manager.getService(serviceId);
    },
    
    /**
     * 获取所有服务
     * @returns 服务列表
     */
    getAllServices: (): ServiceDefinition[] => {
      return manager.getAllServices(pluginId);
    },
    
    /**
     * 调用服务方法
     * @param serviceId 服务ID
     * @param method 方法名
     * @param params 参数
     * @returns 方法返回值
     */
    callServiceMethod: async (
      serviceId: string,
      method: string,
      params?: unknown
    ): Promise<unknown> => {
      return manager.callServiceMethod(pluginId, serviceId, method, params);
    }
  };
}
