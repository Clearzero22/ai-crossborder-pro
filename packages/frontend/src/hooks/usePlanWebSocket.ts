// src/hooks/usePlanWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import type { PlanUpdateMessage } from '../types/plan';

// 管理与后端的WebSocket 连接，实时接受套餐更新

// 自动重连
// 连接断开后自动重连
// 指数退避策略 1s -> 2s -> 4s -> .... -> 最多30秒
// 最多重连 10 次

// PlanContext -> 用它连接并接受套餐更新

interface UsePlanWebSocketOptions {
  wsUrl: string;
  onMessage: (message: PlanUpdateMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

/**
 * WebSocket 连接管理
 */
export function usePlanWebSocket({
  wsUrl,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: UsePlanWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: PlanUpdateMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        onDisconnect?.();

        // 自动重连（指数退避）
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [wsUrl, onMessage, onConnect, onDisconnect, onError]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { connect, disconnect };
}
