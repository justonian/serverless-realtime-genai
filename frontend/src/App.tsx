import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  TextField,
  Heading,
  View,
  Card,
  Grid,
  Table,
  TableRow,
  TableCell,
  TableBody,
  ScrollView,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";

import { generateClient } from 'aws-amplify/data';
import { createThread, createMessageAsync, deleteThread } from './graphql/mutations';
import { getAllThreads } from './graphql/queries';
import { Thread } from "./API";
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
    getConversations();
  }, [threadId]);

  async function getConversations() {
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

    getConversations();
  }

   

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Grid   columnGap="0.5rem"
        rowGap="0.5rem"
        templateColumns="2fr 5fr"
        templateRows="1fr 6fr 10fr">
        <Card
          columnStart="1"
          columnEnd="2"
        >
          <Button variation="primary" onClick={() => setThreadId("")}>New Conversation</Button>
        </Card>
        <Card
          columnStart="2"
          columnEnd="3"
        >
          <Heading level={1}>Bedrock Real-Time Chat</Heading>
        </Card>
        <Card
          columnStart="1"
          columnEnd="2"
        >
          <ScrollView width="100%" height="600px" maxWidth="1080px">
          <Table
            caption=""
            highlightOnHover={true}>
            <TableBody>
            {conversations.map((conversation) => (
              <TableRow key={conversation.threadId}
                onClick={() => setThreadId(conversation.threadId)}
              >
                <TableCell>{conversation.messages!.length > 0 ? conversation.messages[0].message : ""}</TableCell>
                <TableCell>
                <Button
                  variation="destructive"
                  onClick={() => deleteConversation(conversation.threadId)}
                >
                  X
                </Button>
                </TableCell>
              </TableRow>
            ))}
            </TableBody>
          </Table>
          </ScrollView>
          <Button onClick={() => {
            setConversations([]);
            setThreadId("");
            if (signOut) {
              signOut();
            }
            
          }}>Sign Out</Button>
        </Card>
        
                <Card>
          {threadId &&  (
                <Conversation threadId={threadId}/>
              )}
           {!threadId && (
          <View as="form" margin="3rem 0" onSubmit={(event) => createConversation(user, event)}>
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
          
          )
        }
        </Card>  
        <Card
        rowStart = "3"
        columnStart="2"
        columnEnd="-1">
        </Card>

        </Grid>
      )}
    </Authenticator>
  );
}
