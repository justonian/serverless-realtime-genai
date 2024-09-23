import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Image,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";

import { generateClient } from 'aws-amplify/data';
import { createThread, createMessageAsync, deleteThread } from './graphql/mutations';
import { getAllThreads, getThread } from './graphql/queries';
import { Thread } from "./API";
import { recieveMessageChunkAsync } from "./graphql/subscriptions";
/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

const client = generateClient({
  authMode: "userPool",
});

export default function Conversation({threadId }: {
    threadId: string
}) {
  const [conversation, setConversation] = useState<Thread>();
  const [loading, setLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>();

   /**
   * Creates a subscription to recieve messages from the chatbot.
   * @returns
   */
   const createSubscription = () => {
    // Create subscription function
    return client
      .graphql({
        query: recieveMessageChunkAsync,
        variables: { input: { threadId } }
      })
      .subscribe({
        next: ({ data }) => {
          const response = data?.recieveMessageChunkAsync;

          if (response) {
            if (response.chunkType === 'text') {
              setLastMessage((prevMessage: any) => {
                if (prevMessage) {
                  return {
                    ...prevMessage,
                    message: response.chunk
                  };
                }
                return {
                  sender: 'Assistant',
                  message: response.chunk,
                  createdAt: new Date().toISOString()
                };
              });
            }

            // Error chunk
            if (response.chunkType === 'error') {
              // addAlert(response.chunk, 'error');
              setLoading(false);
            }

            if (response.chunkType === 'status' && response.status === 'COMPLETE') {
              setLoading(false);
            }
          }
        },
        error: (error) => {
          console.error(error);
          // addAlert(error?.message ?? 'Something went wrong!', 'warning');
        }
      });
  };

  useEffect(() => {
    if (!threadId) return;
    getConversation();
    const subscription = createSubscription();
    return () => subscription.unsubscribe();
  }, [threadId]);

  async function sendMessage(event: any) {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);

    let messageResponse = await client.graphql({
      query: createMessageAsync,
      variables: {
        input: {
          threadId: conversation?.threadId || threadId,
          prompt: form.get("prompt") as string,
    }}});

    console.log(messageResponse);
    event.target.reset();
  }

  async function deleteConversation(threadId: string ) {
    await client.graphql({
      query: deleteThread,
      variables: {
        input: {
          threadId
        },
    }});
  }

  async function getConversation( ) {
    let val = await client.graphql({
      query: getThread,
      variables: {
        input: {
          threadId
        },
    }});

    setConversation(val.data.getThread!);
  }

   

  return (
    <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <Heading level={1}>Conversation</Heading>
          <View as="form" margin="3rem 0" onSubmit={sendMessage}>
            <Flex
              direction="column"
              justifyContent="center"
              gap="2rem"
              padding="2rem"
            >
              {conversation && conversation.messages && (
                <View>
                  {conversation.messages!.map((message, index) => (
                    <Flex key={index} direction="row" alignItems="center" margin="1rem 0">
                      <Text>{message.sender}</Text>
                      <Text>{message.message}</Text>
                    </Flex>
                  ))}
                  {lastMessage && lastMessage.message && (
                  <Flex>
                  <Text>{lastMessage.sender}</Text>
                  <Text>{lastMessage.message}</Text>
                  </Flex>
                  )}
                </View>
              )}
              <TextField
                name="prompt"
                placeholder="Ask me a question"
                label="Note Name"
                labelHidden
                variation="quiet"
                required
              />

              <Button type="submit" variation="primary">
                Submit
              </Button>
            </Flex>
          </View>
          <Divider />
        </Flex>
  );
}
