import { APIResponse } from '../types';

export class Logger {
  private static prefix = '[Midnight Wallet]';

  static log(message: string, ...args: any[]): void {
    console.log(`${this.prefix} ${message}`, ...args);
  }

  static error(message: string, error?: any): void {
    console.error(`${this.prefix} ERROR: ${message}`, error);
  }

  static warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} WARNING: ${message}`, ...args);
  }

  static info(message: string, ...args: any[]): void {
    console.info(`${this.prefix} INFO: ${message}`, ...args);
  }
}

export class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      return await response.json();
    } catch (error) {
      Logger.error(`GET ${endpoint} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      });
      return await response.json();
    } catch (error) {
      Logger.error(`POST ${endpoint} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export class EventEmitter<T extends Record<string, any[]>> {
  private listeners: Partial<{ [K in keyof T]: ((...args: T[K]) => void)[] }> = {};

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    if (!this.listeners[event]) return;
    const index = this.listeners[event]!.indexOf(listener);
    if (index > -1) {
      this.listeners[event]!.splice(index, 1);
    }
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    if (!this.listeners[event]) return;
    this.listeners[event]!.forEach(listener => listener(...args));
  }
}

export const formatAddress = (address: string | null): string => {
  if (!address) return 'Not Available';
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-10)}`;
};

export const formatBalance = (balance: string | number): string => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  if (isNaN(num)) return '0';
  if (num === 0) return '0';
  if (num < 0.001) return '< 0.001';
  return num.toFixed(3);
};

export const generateProcessId = (): string => {
  return `${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
