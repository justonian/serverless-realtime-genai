import { useState, useEffect } from "react";
import {
  Button,
  Text,
  TextField,
  Flex,
  View,
  Divider,
  ScrollView,
  Loader,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import { generateClient } from 'aws-amplify/data';
import { createMessageAsync } from './graphql/mutations';
import { getConversation } from './graphql/queries';
import { Conversation } from "./API";
import { recieveMessageChunkAsync } from "./graphql/subscriptions";
/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

const client = generateClient({
  authMode: "userPool",
});

export default function ConversationElement({conversationId, prompt }: {
    conversationId: string,
    prompt: string
}) {
  const [conversation, setConversation] = useState<Conversation>({
    conversationId: conversationId,
    messages: [{sender: "User", message: prompt, createdAt: new Date().toISOString()}]
  } as Conversation);
  const [loading, setLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>();

   /**
   * Creates a subscription to recieve messages from the chatbot.
   * @returns
   */
   const createSubscription = () => {
    // Create subscription function
    let count = 0;
    let currentMessage : any = {};
    return client
      .graphql({
        query: recieveMessageChunkAsync,
        variables: { input: { conversationId } }
      })
      .subscribe({
        next: ({ data }) => {
          const response = data?.recieveMessageChunkAsync;

          if (response) {
            if (response.chunkType === 'text') {
              console.log("Received response chunk ", count++, response.chunk);
              setLastMessage((prevMessage: any) => {
                if (prevMessage) {
                  currentMessage = {
                    ...prevMessage,
                    message: prevMessage.message + (response.chunk || ''),
                  };
                } else {
                    currentMessage = {
                    sender: 'Assistant',
                    message: response.chunk || '',
                    createdAt: new Date().toISOString()
                  };
                }
                return currentMessage;
              });
              
            }

            // Error chunk
            if (response.chunkType === 'error') {
              // addAlert(response.chunk, 'error');
              setLoading(false);
            }

            if (response.chunkType === 'status' && response.status === 'COMPLETE') {
              setLoading(false);
              console.log("Received final response chunk", currentMessage);
              count = 0;
              currentMessage = {};
              setConversation({...conversation, messages: [...(conversation.messages || []), currentMessage]});
              setLastMessage({});
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
    if (!conversationId) return;
    setLastMessage({});
    getConversationData();
    console.log("Set conversation ID to", conversationId);
    const subscription = createSubscription();
    return () => subscription.unsubscribe();
  }, [conversationId]);

  // Once loaded, append lastMessage and clear lastMessage
  useEffect(() => { 
    if (loading == false) {
      let messages = conversation?.messages || [];
      messages = [...messages];
      messages.push({...lastMessage});
      setConversation({...conversation,
        messages} as Conversation);
      setLastMessage({sender: 'Assistant', message: ''});
    }

  }, [loading]);

  async function sendMessage(event: any) {
    event.preventDefault();
    setLoading(true);
    
    const form = new FormData(event.target as HTMLFormElement);
    let userPrompt =form.get("prompt") as string;
    let messages = conversation?.messages || [];
    messages.push({
        sender: "User",
        message: userPrompt,
        createdAt: new Date().toISOString()
    } as any);
    setConversation({...conversation,
      messages,} as Conversation);
     console.log("messages after", messages);
    
    let messageResponse = await client.graphql({
      query: createMessageAsync,
      variables: {
        input: {
          conversationId: conversation?.conversationId || conversationId,
          prompt,
    }}});
    console.log("Sending message " + prompt + " to conversation ID " + conversation?.conversationId || conversationId);

    event.target.reset();
  }

  async function getConversationData( ) {
    let val = await client.graphql({
      query: getConversation,
      variables: {
        input: {
          conversationId
        },
    }});
    console.log("Getting data", val.data.getConversation);
    setConversation(val.data.getConversation!);
  }

   

  return (

          <View as="form" onSubmit={sendMessage}>
            <ScrollView width="100%" height="600px" maxWidth="1080px">
              {conversation && conversation.messages && (
                <View>
                  <Flex>
                  <Text>{"User"}</Text>
                  <Text>{prompt}</Text>
                  </Flex>
                  {conversation.messages!.map((message, index) => (
                    index > 0 && (
                    <Flex key={index} direction="row" alignItems="center" margin="1rem 0">
                      <Text>{message.sender}</Text>
                      <Text>{message.message}</Text>
                    </Flex>)
                  ))}
                  {lastMessage && lastMessage.message && (
                  <Flex>
                  <Text>{lastMessage.sender}</Text>
                  <Text>{lastMessage.message}</Text>
                  </Flex>
                  )}
                </View>
              )}

            <Divider />
              
              </ScrollView>
              {loading &&
            <Loader></Loader>
            }
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
            
          </View>
          
        
  );
}
