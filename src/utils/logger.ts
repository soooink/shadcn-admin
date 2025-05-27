/**
 * 日志工具类
 * 提供统一的日志记录功能，支持不同级别的日志和自定义前缀
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  NONE = 'none' // 不输出任何日志
}

/**
 * 日志配置
 */
interface LoggerConfig {
  /** 日志级别 */
  level: LogLevel;
  /** 是否在生产环境中输出日志 */
  enableInProduction: boolean;
  /** 自定义格式化函数 */
  formatter?: (level: LogLevel, prefix: string, message: string, ...args: unknown[]) => string;
}

/**
 * 全局日志配置
 */
const globalConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG,
  enableInProduction: false,
  formatter: (level, prefix, message) => `[${level.toUpperCase()}]${prefix ? ` ${prefix}` : ''} ${message}`
};

/**
 * 日志级别优先级
 */
const logLevelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.NONE]: 4
};

/**
 * 日志记录器类
 */
export class Logger {
  private prefix: string;
  private config: LoggerConfig;

  /**
   * 构造函数
   * @param prefix 日志前缀
   * @param config 日志配置
   */
  constructor(prefix = '', config: Partial<LoggerConfig> = {}) {
    this.prefix = prefix;
    this.config = { ...globalConfig, ...config };
  }

  /**
   * 设置日志前缀
   * @param prefix 日志前缀
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * 设置日志配置
   * @param config 日志配置
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 判断是否应该记录指定级别的日志
   * @param level 日志级别
   * @returns 是否应该记录
   */
  private shouldLog(level: LogLevel): boolean {
    // 生产环境下，如果未启用日志，则不记录
    if (process.env.NODE_ENV === 'production' && !this.config.enableInProduction) {
      return false;
    }

    // 根据日志级别优先级判断是否记录
    return logLevelPriority[level] >= logLevelPriority[this.config.level];
  }

  /**
   * 格式化日志消息
   * @param level 日志级别
   * @param message 日志消息
   * @param args 其他参数
   * @returns 格式化后的消息
   */
  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    if (this.config.formatter) {
      return this.config.formatter(level, this.prefix, message, ...args);
    }
    return `[${level.toUpperCase()}]${this.prefix ? ` ${this.prefix}` : ''} ${message}`;
  }

  /**
   * 记录调试级别日志
   * @param message 日志消息
   * @param args 其他参数
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  /**
   * 记录信息级别日志
   * @param message 日志消息
   * @param args 其他参数
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message), ...args);
    }
  }

  /**
   * 记录警告级别日志
   * @param message 日志消息
   * @param args 其他参数
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
    }
  }

  /**
   * 记录错误级别日志
   * @param message 日志消息
   * @param args 其他参数
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message), ...args);
    }
  }
}

/**
 * 创建日志记录器
 * @param prefix 日志前缀
 * @param config 日志配置
 * @returns 日志记录器实例
 */
export function createLogger(prefix = '', config: Partial<LoggerConfig> = {}): Logger {
  return new Logger(prefix, config);
}

/**
 * 设置全局日志配置
 * @param config 日志配置
 */
export function setGlobalLogConfig(config: Partial<LoggerConfig>): void {
  Object.assign(globalConfig, config);
}

/**
 * 系统日志记录器
 */
export const systemLogger = createLogger('System');

/**
 * 插件系统日志记录器
 */
export const pluginLogger = createLogger('Plugin System');

/**
 * 为插件创建日志记录器
 * @param pluginId 插件ID
 * @returns 日志记录器实例
 */
export function createPluginLogger(pluginId: string): Logger {
  return createLogger(`Plugin:${pluginId}`);
}

export default {
  createLogger,
  setGlobalLogConfig,
  systemLogger,
  pluginLogger,
  createPluginLogger,
  LogLevel
};
