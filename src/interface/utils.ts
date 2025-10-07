export interface Spinner {
  start(text?: string): Spinner;
  stop(): Spinner;
  succeed(text?: string): Spinner;
  fail(text?: string): Spinner;
  text: string;
  isSpinning: boolean;
}

export interface ErrorDetails {
  type: string;
  statusCode?: number;
  statusText?: string;
  url?: string;
  responseData?: any;
  code?: string;
  message?: string;
}

export interface ExtendedError extends Error {
  code?: string;
  details?: any;
}
