import { ExecutionResult } from 'graphql';
import { default as MessageTypes } from './messageTypes';

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];

export interface GraphQLParams {
  query?: string | null;
  variables?: Record<string, any> | null;
  operationName?: string | null;
  extensions?: Record<string, any> | null;
  // Allow additional keys
  [key: string]: any;
}

export interface OperationMessage {
  id?: string;
  payload: ExecutionResult;
  type: MessageType;
}

export interface SubscriptionOperation {
  observer: Observer<ExecutionResult>;
  params: GraphQLParams;
  started: boolean;
  ack: boolean;
}

// Observable
export interface Observable<T> {
  subscribe(
    observerOrNext: NonNullable<Observer<T> | Observer<T>['next']>,
    onError?: Observer<T>['error'],
    onComplete?: Observer<T>['complete']
  ): Subscription;
}

export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

interface Subscription {
  unsubscribe(): void;
}
