/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createThread = /* GraphQL */ `mutation CreateThread {
  createThread {
    thread {
      threadId
      userId
      status
      createdAt
      __typename
    }
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateThreadMutationVariables,
  APITypes.CreateThreadMutation
>;
export const createMessageAsync = /* GraphQL */ `mutation CreateMessageAsync($input: CreateMessageInput!) {
  createMessageAsync(input: $input) {
    message {
      sender
      message
      createdAt
      __typename
    }
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateMessageAsyncMutationVariables,
  APITypes.CreateMessageAsyncMutation
>;
export const deleteThread = /* GraphQL */ `mutation DeleteThread($input: DeleteThreadInput!) {
  deleteThread(input: $input) {
    thread {
      threadId
      userId
      status
      createdAt
      __typename
    }
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteThreadMutationVariables,
  APITypes.DeleteThreadMutation
>;
export const systemSendMessageChunk = /* GraphQL */ `mutation SystemSendMessageChunk($input: SystemSendMessageChunkInput!) {
  systemSendMessageChunk(input: $input) {
    userId
    threadId
    status
    chunkType
    chunk
    __typename
  }
}
` as GeneratedMutation<
  APITypes.SystemSendMessageChunkMutationVariables,
  APITypes.SystemSendMessageChunkMutation
>;
