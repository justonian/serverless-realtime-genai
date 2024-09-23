/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getThread = /* GraphQL */ `query GetThread($input: GetThreadInput!) {
  getThread(input: $input) {
    threadId
    userId
    messages {
      sender
      message
      createdAt
      __typename
    }
    status
    createdAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetThreadQueryVariables, APITypes.GetThreadQuery>;
export const getAllThreads = /* GraphQL */ `query GetAllThreads {
  getAllThreads {
    threadId
    userId
    messages {
      sender
      message
      createdAt
      __typename
    }
    status
    createdAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetAllThreadsQueryVariables,
  APITypes.GetAllThreadsQuery
>;
