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
import { getAllThreads } from './graphql/queries';
import { Thread } from "./API";
import { recieveMessageChunkAsync } from "./graphql/subscriptions";
import Conversation from "./Conversation";
/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_w57eaVg3j",
      userPoolClientId: "1qbg8ga9h3dldtahtk8ne33f44",
    }
  },
  API: {
    GraphQL: {
      defaultAuthMode: "userPool",
      region: "us-east-1",
      endpoint: "https://cdd2l2oytbb3jifi32s6udysfi.appsync-api.us-east-1.amazonaws.com/graphql"
    }
  }
});
const client = generateClient({
  authMode: "userPool",
});

export default function App() {
  const [conversations, setConversations] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState("");


  useEffect(() => {
    fetchNotes();
  }, [threadId]);

  async function fetchNotes() {
    const conversations = await client.graphql({
      query: getAllThreads});
      console.log(conversations);
      setConversations(conversations.data.getAllThreads || []);
  }

  async function createConversation(user: any, event: any) {
    event.preventDefault();
    const form = new FormData(event.target);
    console.log(user);
    let res = await client.graphql({
      query: createThread,
     });
    console.log(res);
    setThreadId(res.data.createThread.thread!.threadId);
    
    let messageResponse = await client.graphql({
      query: createMessageAsync,
      variables: {
        input: {
          threadId: res.data.createThread.thread!.threadId,
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

    fetchNotes();
  }

   

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <Heading level={1}>Bedrock chat App</Heading>
          {threadId &&  (
                <Conversation threadId={threadId}/>
              )}
           {!threadId && (
          <View as="form" margin="3rem 0" onSubmit={(event) => createConversation(user, event)}>
            <Flex
              direction="column"
              justifyContent="center"
              gap="2rem"
              padding="2rem"
            >
              
             
                <View>
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
              
              
            </Flex>
          </View>
          )
        }
          <Divider />
          <Heading level={2}>Current Conversations</Heading>
          <Grid
            margin="3rem 0"
            autoFlow="column"
            justifyContent="center"
            gap="2rem"
            alignContent="center"
          >
            {conversations.map((conversation) => (
              <Flex
                key={conversation.threadId}
                direction="column"
                justifyContent="center"
                alignItems="center"
                gap="2rem"
                border="1px solid #ccc"
                padding="2rem"
                borderRadius="5%"
                className="box"
                onClick={() => setThreadId(conversation.threadId)}
              >
                <View>
                  <Heading level={6}>{conversation.messages!.length > 0 ? conversation.messages[0].message : ""}</Heading>
                </View>
                <Button
                  variation="destructive"
                  onClick={() => deleteConversation(conversation.threadId)}
                >
                  Delete conversation
                </Button>
              </Flex>
            ))}
          </Grid>
          <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
    </Authenticator>
  );
}

function useParams(): { threadId: any; } {
  throw new Error("Function not implemented.");
}
