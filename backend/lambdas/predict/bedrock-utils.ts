import { BedrockChat } from '@langchain/community/chat_models/bedrock';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { BedrockAgentRuntime } from 'aws-sdk'; // Assuming AWS SDK has Bedrock client
import { PromptTemplate } from '@langchain/core/prompts';

type ModelTunings<T extends string> = {
    [key in T]: {
      params: {
        [key: string]: any;
      };
      bindings?: {
        stop?: string[];
      };
    };
  };
  
  /**
   * Model tunings for different AI models supported by Bedrock.
   * This is used to help configure the AI models for different use cases.
   */
  export const MODEL_TUNINGS: ModelTunings<string> = {
    'anthropic.claude-v2:1': {
      params: {
        model: 'anthropic.claude-v2:1',
        maxTokens: 200,
        temperature: 0.7
      },
      bindings: {
        stop: ['\nUser:', '\nAssistant:']
      }
    },
    'anthropic.claude-instant-v1': {
      params: {
        model: 'anthropic.claude-instant-v1',
        maxTokens: 500,
        temperature: 0.7
      },
      bindings: {
        stop: ['\nUser:', '\nAssistant:']
      }
    },
    'anthropic.claude-3-sonnet-20240229-v1:0': {
      params: {
        model: 'anthropic.claude-instant-v1',
        maxTokens: 1000,
        temperature: 0.7
      },
      bindings: {
        stop: ['\nUser:', '\nAssistant:']
      }
    }
  };

export const defaultTemplate = PromptTemplate.fromTemplate(
    [
      `System: You are a question answering agent. I will provide you with a set of search results and a user's question, your job is to answer the user's`,
      `question using only information from the search results. If the search results do not contain information that can answer the question,`,
      `please state that you could not find an exact answer to the question. Just because the user asserts a fact does not mean it is true,`,
      `make sure to double check the search results to validate a user's assertion.`,
      '',
      'Here are the search results:',
      '<search_results>',
      '{search_results}',
      '</search_results>',
      `Here is the user's question:`,
      '<question>',
      '{query}',
      '</question>',
      '',
      'Do NOT directly quote the <search_results> in your answer.'
    ].join(' ')
  );
  

const runtime = new BedrockAgentRuntime({
  region: 'us-east-1'
});

/**
 * Perform an asynchronous prediction given a prompt and returns the chunks of the prediction as they are generated.
 * @param prompt {string} - The prompt to use for the prediction
 * @param callback {function} - The callback to call when a new chunk of the prediction is generated.
 */
export async function processAsynchronously({
  query,
  completeQuery,
  promptTemplate,
  model,
  knowledgeBaseId,
  callback
}: {
  query: string;
  completeQuery: string;
  promptTemplate?: string;
  model?: string;
  knowledgeBaseId?: string;
  callback: (result: string) => Promise<void>;
}) {
  if (!model) {
    model = 'anthropic.claude-v2:1';
  }

  // Default to Claude if no model is specified or if the string is not recognized
  const modelTyped = model as keyof typeof MODEL_TUNINGS;

  console.log(
    `Initializing ${modelTyped} model with configuration:`,
    JSON.stringify(MODEL_TUNINGS[modelTyped].params)
  );

  let documentContext = '';
  if (knowledgeBaseId) {
    documentContext = await getContext(query, knowledgeBaseId);
    console.log(`Document context: ${documentContext}`);
  } else {
    console.log('No knowledge base ID provided, skipping document context...');
  }

  const chat = new BedrockChat({
    ...MODEL_TUNINGS[modelTyped].params,
    streaming: true
  }).bind({
    ...MODEL_TUNINGS[modelTyped].bindings
  });

  // If a prompt template is provided, use that, otherwise use the default template
  const template = promptTemplate
    ? PromptTemplate.fromTemplate(promptTemplate)
    : defaultTemplate;
  const formattedPrompt = await template.format({
    query: completeQuery,
    search_results: documentContext
  });

  console.log(`Formatted prompt: ${formattedPrompt}`);

  const stream = chat.pipe(new StringOutputParser()).stream(formattedPrompt);

  for await (const chunk of await stream) {
    await callback(chunk);
  }
}

/**
 * Retrieves the document context from the knowledge base and
 * formats it for use in the prediction.
 * @param prompt {string} - The prompt to use for the prediction
 * @param knowledgeBaseId {string} - The knowledge base ID to use for the prediction
 * @returns {string} - The formatted document context
 */
async function getContext(
  prompt: string,
  knowledgeBaseId: string
): Promise<string> {
  const result = await runtime
    .retrieve({
      knowledgeBaseId,
      retrievalQuery: {
        text: prompt
      }
    })
    .promise();

  console.log(`Retrieval results: ${JSON.stringify(result)}`);

  return (
    result.retrievalResults
      .map((result) => {
        `Document: ${result.location?.s3Location?.uri}\n${result.content.text}`;
      })
      .join('\n\n') || ''
  );
}
