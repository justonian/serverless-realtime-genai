import { addMessage, updateThreadStatus } from './dynamodb';
import { EventType, MessageSystemStatus } from './types';
import { sendChunk } from './queries';
import { BedrockRuntimeClient, ConverseStreamCommand, Message } from "@aws-sdk/client-bedrock-runtime"; 


const client = new BedrockRuntimeClient({
    region: 'us-east-1'
});


/**
 * Perform an asynchronous prediction given a prompt and returns the chunks of the prediction as they are generated.
 * @param prompt {string} - The prompt to use for the prediction
 * @param callback {function} - The callback to call when a new chunk of the prediction is generated.
 */
export async function processAsynchronously({
  history,
  callback
}: {
  history: Message[];
  callback: (result: string) => Promise<void>;
}) {
  let command = new ConverseStreamCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    messages: history,
    inferenceConfig: {
      maxTokens: 512,
      temperature: 0.5,
      topP: 0.9,
    }
  });

  try {
    const response = client.send(command);

    const result = await response;
    if (result && result.stream) {
      for await (const item of result.stream) {
        if (item.contentBlockDelta && item.contentBlockDelta.delta) {
          await callback(item.contentBlockDelta?.delta?.text ?? '');
        }
      }
    }
  } catch (err) {
    console.error("STREAM ERROR",err);
  }
  
}



const {
    TABLE_NAME = '',
  } = process.env;



/**
 * A timeout task that resolves after a specified timeout.
 * @param timeout The timeout in milliseconds.
 * @returns The result of the timeout task.
 */
export function createTimeoutTask(
    timeout: number
  ): Promise<{ statusCode: number; message: string }> {
    return new Promise((resolve) => {
      setTimeout(
        () => resolve({ statusCode: 504, message: 'Task timed out!' }),
        timeout
      );
    });
  }
  

/**
 * Processes a single event.
 * @param userId {string} The user ID.
 * @param threadId {string} The thread ID.
 * @param userPrompt {string} The full prompt to process. This includes the thread's system prompt, message history, user's prompt, and start of the AI's response.
 * @param eventTimeout {number} The timeout for the event.
 * @returns {Promise<{ statusCode: number; message: string }>} The result of the event.
 */
export async function processSingleEvent({
  userId,
  threadId,
  history,
  query,
  eventTimeout,
}: EventType) {
  // Add the user's message to the conversation history.
  // This allows the AI model to use the user's message as context for generating the response.
  const updatedHistory = [...history, { sender: 'User', message: query }];
  const formattedHistory: Message[] = updatedHistory
    .map(({ sender, message }) => ({
      role: sender === "User" ? "user" : "assistant",
      content: [
        {
          text: message
        }
      ]
    }));

  let res = { statusCode: 200, message: 'Event processed successfully.' };
  let generatedText = '';
  let generatedTextLastSentence = '';

  // The timeout task is used to ensure that the event does not run indefinitely
  // or for longer than the specified timeout.
  const timeoutTask = createTimeoutTask(eventTimeout);

  try {
    // The processing task is used to process the prompt asynchronously
    // and stream the response to the user as it is generated.
    const processingTask: Promise<{
      statusCode: number;
      message: string;
    }> = new Promise(async (resolve, reject) => {
      console.log(`Processing prompt: ${formattedHistory}`);
      
      await Promise.all([
        addMessage({
          id: userId,
          threadId,
          message: query,
          sender: 'User',
          tableName: TABLE_NAME
        }),

        processAsynchronously({
          history: formattedHistory,
          callback: async (chunk) => {
            try {
              generatedText += chunk;
              generatedTextLastSentence += chunk;

              console.log(`Received Text Chunk: ${chunk}`);
              await sendChunk({
                userId,
                threadId,
                chunk: generatedText,
                chunkType: 'text'
              });

            } catch (err) {
              console.error(
                'An error occurred while processing the chunk:',
                err
              );
              await sendChunk({
                userId,
                threadId,
                chunk: 'An error occurred while processing the prompt.',
                chunkType: 'error'
              });
              reject({
                statusCode: 500,
                message: 'An error occurred while processing the prompt.'
              });
            }
          }
        })
      ]);

      resolve({
        statusCode: 200,
        message: 'Event processed successfully.'
      });
    });

    // Here, we race the processing task and the timeout task.
    // This is done so that time is left for error handling if the processing task fails,
    // that is relayed to the client.
    res = await Promise.race([processingTask, timeoutTask]);
  } catch (err) {
    console.error('An error occurred while processing the event:', err);
    generatedText = 'An error occurred while processing the prompt.';
    await sendChunk({
      userId,
      threadId,
      chunk: 'An error occurred while processing the prompt.',
      chunkType: 'error'
    });
    res = {
      statusCode: 500,
      message: 'An error occurred while processing the prompt.'
    };
  }

  await Promise.all([
    addMessage({
      id: userId,
      threadId,
      message: generatedText,
      sender: 'Assistant',
      tableName: TABLE_NAME
    }),
    updateThreadStatus({
      userId: userId,
      threadId,
      status: MessageSystemStatus.COMPLETE,
      tableName: TABLE_NAME
    }),
    sendChunk({
      userId,
      threadId,
      status: MessageSystemStatus.COMPLETE,
      chunkType: 'status'
    })
  ]);

  return res;
}
