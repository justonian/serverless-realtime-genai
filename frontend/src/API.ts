/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateThreadPayload = {
  __typename: "CreateThreadPayload",
  thread?: Thread | null,
};

export type Thread = {
  __typename: "Thread",
  threadId: string,
  userId: string,
  messages?:  Array<Message > | null,
  status: ThreadStatus,
  createdAt: string,
};

export type Message = {
  __typename: "Message",
  sender: string,
  message: string,
  createdAt: string,
};

// ############# ENUMS #####################
export enum ThreadStatus {
  NEW = "NEW",
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETE = "COMPLETE",
  ERROR = "ERROR",
}


export type CreateMessageInput = {
  threadId: string,
  prompt: string,
};

export type CreateMessagePayload = {
  __typename: "CreateMessagePayload",
  message?: Message | null,
};

export type DeleteThreadInput = {
  threadId: string,
};

export type DeleteThreadPayload = {
  __typename: "DeleteThreadPayload",
  thread?: Thread | null,
};

export type SystemSendMessageChunkInput = {
  userId: string,
  threadId: string,
  status: ThreadStatus,
  chunkType: string,
  chunk: string,
};

export type MessageChunk = {
  __typename: "MessageChunk",
  userId: string,
  threadId: string,
  status: ThreadStatus,
  chunkType: string,
  chunk: string,
};

export type GetThreadInput = {
  threadId: string,
};

export type RecieveMessageChunkAsyncInput = {
  threadId: string,
};

export type CreateThreadMutationVariables = {
};

export type CreateThreadMutation = {
  // Creation
  createThread?:  {
    __typename: "CreateThreadPayload",
    thread?:  {
      __typename: "Thread",
      threadId: string,
      userId: string,
      status: ThreadStatus,
      createdAt: string,
    } | null,
  } | null,
};

export type CreateMessageAsyncMutationVariables = {
  input: CreateMessageInput,
};

export type CreateMessageAsyncMutation = {
  createMessageAsync?:  {
    __typename: "CreateMessagePayload",
    message?:  {
      __typename: "Message",
      sender: string,
      message: string,
      createdAt: string,
    } | null,
  } | null,
};

export type DeleteThreadMutationVariables = {
  input: DeleteThreadInput,
};

export type DeleteThreadMutation = {
  // Deletion
  deleteThread?:  {
    __typename: "DeleteThreadPayload",
    thread?:  {
      __typename: "Thread",
      threadId: string,
      userId: string,
      status: ThreadStatus,
      createdAt: string,
    } | null,
  } | null,
};

export type SystemSendMessageChunkMutationVariables = {
  input: SystemSendMessageChunkInput,
};

export type SystemSendMessageChunkMutation = {
  // System
  systemSendMessageChunk?:  {
    __typename: "MessageChunk",
    userId: string,
    threadId: string,
    status: ThreadStatus,
    chunkType: string,
    chunk: string,
  } | null,
};

export type GetThreadQueryVariables = {
  input: GetThreadInput,
};

export type GetThreadQuery = {
  getThread?:  {
    __typename: "Thread",
    threadId: string,
    userId: string,
    messages?:  Array< {
      __typename: "Message",
      sender: string,
      message: string,
      createdAt: string,
    } > | null,
    status: ThreadStatus,
    createdAt: string,
  } | null,
};

export type GetAllThreadsQueryVariables = {
};

export type GetAllThreadsQuery = {
  getAllThreads?:  Array< {
    __typename: "Thread",
    threadId: string,
    userId: string,
    messages?:  Array< {
      __typename: "Message",
      sender: string,
      message: string,
      createdAt: string,
    } > | null,
    status: ThreadStatus,
    createdAt: string,
  } > | null,
};

export type RecieveMessageChunkAsyncSubscriptionVariables = {
  input: RecieveMessageChunkAsyncInput,
};

export type RecieveMessageChunkAsyncSubscription = {
  recieveMessageChunkAsync?:  {
    __typename: "MessageChunk",
    userId: string,
    threadId: string,
    status: ThreadStatus,
    chunkType: string,
    chunk: string,
  } | null,
};
