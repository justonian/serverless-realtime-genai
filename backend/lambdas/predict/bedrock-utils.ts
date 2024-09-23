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

