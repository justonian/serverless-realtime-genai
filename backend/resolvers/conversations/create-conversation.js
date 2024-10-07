import { util } from '@aws-appsync/utils';

/**
 * Creates a new conversation in the DynamoDB table.
 */
export function request(ctx) {
  // Generates a random ID for the conversation item
  const id = util.autoId();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      pk: `USER#${ctx.identity.sub}`,
      sk: `CONVERSATION#${id}`
    }),
    update: {
      expression:
        'SET #messages = :messages, #status = :status, #createdAt = :createdAt, #ttl = :ttl',
      expressionNames: {
        '#status': 'status',
        '#createdAt': 'createdAt',
        '#messages': 'messages',
        '#ttl': 'ttl'
      },
      expressionValues: {
        ':status': { S: 'NEW' },
        ':createdAt': { S: `${util.time.nowISO8601()}` },
        ':messages': { L: [] },
        ':ttl': { N: `${util.time.nowEpochMilliSeconds() + 60 * 60 * 24 * 7}` } // 7 days
      }
    }
  };
}

/**
 * Returns the conversation or throws an error if the operation failed
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
