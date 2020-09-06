import { ExecutionResult } from 'graphql';
import { default as MessageTypes, GRAPHQL_WS } from './messageTypes';
import {
  SubscriptionOperation,
  GraphQLParams,
  Observable,
  Observer,
  OperationMessage,
  MessageType,
} from './types';

export default class SubscriptionClient {
  socket: WebSocket | null = null;
  public operations: Map<string, SubscriptionOperation> = new Map();

  // Number of attempted reconnection
  private reconnectAttempts = 0;

  // This is used to generate ids if genId is not defined
  private nextOperationId = 0;

  constructor(
    private url: string,
    private options?: {
      reconnectionAttempts?: number;
      genId?: (params: GraphQLParams) => string;
    }
  ) {
    this.connect();
  }

  public request(params: GraphQLParams): Observable<ExecutionResult> {
    return {
      subscribe: (observerOrNext, onError, onComplete) => {
        const observer: Observer<ExecutionResult> =
          typeof observerOrNext === 'function'
            ? {
                next: observerOrNext,
                error: onError,
                complete: onComplete,
              }
            : observerOrNext;
        const operation: SubscriptionOperation = {
          observer,
          params,
          started: false,
          ack: false,
        };

        const opId =
          this.options?.genId?.(params) || String(++this.nextOperationId);

        this.operations.set(opId, operation);
        this.startOperation(opId);

        return {
          unsubscribe: () => {
            this.unsubscribe(opId);
          },
        };
      },
    };
  }

  public close() {
    if (this.socket === null) return;
    (this.socket as any).closedByUser = true;
    this.unsubscribeAll();
    setTimeout(() => {
      // Wait for all unsubscribe messages flushed
      this.socket!.close();
    }, 1000);
  }

  public unsubscribeAll() {
    for (const operationId of this.operations.keys()) {
      this.unsubscribe(operationId);
    }
  }

  get status() {
    return this.socket?.readyState || WebSocket.CLOSED;
  }

  private connect() {
    this.socket = new WebSocket(this.url, GRAPHQL_WS);

    this.socket.onopen = async () => {
      if (this.socket!.readyState !== WebSocket.OPEN) return;
      this.reconnectAttempts = 0;
      // Flush all operations in case of reconnection
      for (const operationId of this.operations.keys())
        this.startOperation(operationId);
    };

    this.socket.onclose = () => {
      // Mark all operations to be unstarted and unacknowledged
      for (const [operationId, operation] of this.operations) {
        operation.ack = operation.started = false;
        this.operations.set(operationId, operation);
      }
      if (this.socket && !(this.socket as any).closedByUser) {
        this.socket = null;
        this.reconnect();
      } else {
        this.socket = null;
      }
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private reconnect() {
    if (this.reconnectAttempts >= (this.options?.reconnectionAttempts || 0))
      return;
    this.reconnectAttempts++;
    // Reconnect with a backoff strategy
    const delay = Math.pow(2, this.reconnectAttempts - 1) * 0.5 * 1000;
    setTimeout(() => this.connect(), delay);
  }

  private startOperation(operationId: string) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;

    const operation = this.operations.get(operationId);

    if (!operation) return;
    if (operation.started) return;

    operation.started = true;
    this.operations.set(operationId, operation);

    this.sendMessage(MessageTypes.GQL_START, operationId, operation.params);
  }

  private unsubscribe(operationId: string) {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    this.sendMessage(MessageTypes.GQL_STOP, operationId);
  }

  private handleMessage(message: string) {
    const data: OperationMessage = JSON.parse(message);

    const operation: SubscriptionOperation | undefined = data.id
      ? this.operations.get(data.id)
      : undefined;

    switch (data.type) {
      case MessageTypes.GQL_DATA:
        operation && operation.observer.next?.(data.payload);
        break;
      case MessageTypes.GQL_START_ACK:
        if (!operation) return;
        operation.ack = true;
        this.operations.set(data.id!, operation);
        break;
      case MessageTypes.GQL_CONNECTION_ERROR:
        // We only have one error for this event
        operation && operation.observer.error?.(data.payload.errors![0]);
        break;
      case MessageTypes.GQL_ERROR:
        // We only have one error for this event
        operation && operation.observer.error?.(data.payload.errors![0]);
        break;
      case MessageTypes.GQL_COMPLETE:
        if (!operation) return;
        operation.observer.complete?.();
        this.operations.delete(data.id!);
        break;
    }
  }

  private sendMessage(type: MessageType, id?: string, payload?: GraphQLParams) {
    if (!this.socket) return;
    this.socket.send(
      JSON.stringify({
        id,
        type,
        payload,
      })
    );
  }
}
