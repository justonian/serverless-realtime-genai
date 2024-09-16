export interface EventType {
    userId: string;
    threadId: string;
    history: { sender: string; message: string }[];
    query: string;
    eventTimeout: number;
  }
  
  export interface EventResult {
    sender: string;
    message: string;
  }
  
  export enum MessageSystemStatus {
    NEW = 'NEW',
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETE = 'COMPLETE',
    ERROR = 'ERROR'
  }
  