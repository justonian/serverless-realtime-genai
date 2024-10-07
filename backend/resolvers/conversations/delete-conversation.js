import { util } from '@aws-appsync/utils';

/**
 * Deletes a conversation that belongs to the user from the DynamoDB table.
 */
export function request(ctx) {
  const userId = ctx.identity.sub;
  const id = ctx.arguments.input.conversationId;

  return {
    operation: 'DeleteItem',
    key: util.dynamodb.toMapValues({
      pk: `USER#${userId}`,
      sk: `CONVERSATION#${id}`
    })
  };
}

/**
 * Returns the deleted item. Throws an error if the operation failed
 */
export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return {
    conversation: {
      conversationId: ctx.result.sk.split('#')[1],
      userId: ctx.result.pk.split('#')[1],
      ...ctx.result
    }
  };
}
