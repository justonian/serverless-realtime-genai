import { processAsynchronously } from './bedrock-utils';
import { addMessage, updateThreadStatus } from './dynamodb';
import { EventType, MessageSystemStatus } from './types';
import { sendChunk } from './queries';

const {
    TABLE_NAME = '',
  } = process.env;

/**
 * A helper function to extract complete and remaining sentence information from a given string.
 *
 * @example extractSentenceInfo('This is a sentence. This is another sentence that is incomplete') -> { sentence: 'This is a sentence.', remaining: 'This is another sentence that is incomplete', hasComplete: true, endsComplete: false }
 * @example extractSentenceInfo('This is a complete sentence.') -> { sentence: 'This is a complete sentence.', remaining: '', hasComplete: true, endsComplete: true }
 * @example extractSentenceInfo('This is an incomplete sentence') -> { sentence: 'This is an incomplete sentence', remaining: '', hasComplete: false, endsComplete: false }
 *
 * @param text {string} The text to retrieve the sentence from.
 * @returns
 */
export function extractSentenceInfo(
    text: string,
    delimiters: string[] = ['.', '?', '!', ':', '\n']
  ): {
    sentence: string;
    remaining: string;
    hasComplete: boolean;
    endsComplete: boolean;
  } {
    let lastIndex = -1;
  
    for (let i = text.length - 1; i >= 0; i--) {
      if (delimiters.includes(text[i])) {
        lastIndex = i;
        break;
      }
    }
  
    if (lastIndex === -1) {
      return {
        sentence: text,
        remaining: '',
        hasComplete: false,
        endsComplete: false
      };
    }
  
    const sentence = text.slice(0, lastIndex + 1);
    const remaining = text.slice(lastIndex + 1);
    const endsComplete = remaining.trim() === '';
  
    return {
      sentence,
      remaining,
      hasComplete: true,
      endsComplete
    };
  }
  

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
  const formattedHistory = updatedHistory
    .map(({ sender, message }) => `${sender}: ${message}`)
    .join('\n\n')
    .trim();
  const completeQuery = `${formattedHistory}\nAssistant:`;

  // The generated text and audio clips are used to store the response generated by the AI model
  // and voice synthesis service.
  let res = { statusCode: 200, message: 'Event processed successfully.' };
  let generatedText = '';
  let generatedTextLastSentence = '';
  let generatedAudioClips: string[] = [];

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
      console.log(`Processing prompt: ${completeQuery}`);
      
      await Promise.all([
        addMessage({
          id: userId,
          threadId,
          message: query,
          sender: 'User',
          tableName: TABLE_NAME
        }),

        processAsynchronously({
          query,
          completeQuery,
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
      audioClips: generatedAudioClips,
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
