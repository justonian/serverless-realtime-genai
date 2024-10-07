import { get } from '@aws-appsync/utils/dynamodb';
import { util } from '@aws-appsync/utils';

/**
 * Gets a conversation from the DynamoDB table given a conversationId.
 */
export function request(ctx) {
  const userId = ctx.identity.sub;
  const id = ctx.args.input.conversationId;

  return get({
    key: {
      pk: `USER#${userId}`,
      sk: `CONVERSATION#${id}`
    }
  });
}

/**
 * Returns the fetched conversation or throws an error if the operation failed.
 */
export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return {
    conversationId: ctx.result.sk.split('#')[1],
    userId: ctx.result.pk.split('#')[1],
    ...ctx.result
  };
}
