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
import { createConversation, createMessageAsync, deleteConversation } from './graphql/mutations';
import { getAllConversations } from './graphql/queries';
import { Conversation } from "./API";
import ConversationElement from "./ConversationElement";
/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_uDGV2jbfJ",
      userPoolClientId: "15mj3s3rsqc7fu7d42t24lv32f",
    }
  },
  API: {
    GraphQL: {
      defaultAuthMode: "userPool",
      region: "us-east-1",
      endpoint: "https://eyths4xeavgcrklbowtpbr3dlm.appsync-api.us-east-1.amazonaws.com/graphql"
    }
  }
});
const client = generateClient({
  authMode: "userPool",
});

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  


  useEffect(() => {
    getConversations();
  }, [conversationId]);

  async function getConversations() {
    const conversations = await client.graphql({
      query: getAllConversations});
      console.log(conversations);
      setConversations(conversations.data.getAllConversations || []);
  }

  async function handleCreateConversation(user: any, event: any) {
    event.preventDefault();
    const form = new FormData(event.target);
    console.log(user);
    let res = await client.graphql({
      query: createConversation,
     });
    setConversationId(res.data.createConversation.conversation!.conversationId);
    console.log("Created new conversation ID ", res.data.createConversation.conversation!.conversationId);
    
    let messageResponse = await client.graphql({
      query: createMessageAsync,
      variables: {
        input: {
          conversationId: res.data.createConversation.conversation!.conversationId,
          prompt: form.get("prompt") as string,
    }}});
    console.log("Created new message ID ", messageResponse.data.createMessageAsync.message!.message);
    event.target.reset();
  }

  async function handleDeleteConversation(conversationId: string ) {
    await client.graphql({
      query: deleteConversation,
      variables: {
        input: {
          conversationId
        },
    }});
    console.log("Deleted conversation ID to", conversationId);
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
          <Button variation="primary" onClick={() => setConversationId("")}>New Conversation</Button>
        </Card>
        <Card
          columnStart="2"
          columnEnd="3"
        >
          <Heading level={1}>Serverless Real-Time Bedrock Chat</Heading>
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
              <TableRow key={conversation.conversationId}
                onClick={() => setConversationId(conversation.conversationId)}
              >
                <TableCell>{(conversation.messages ?? []).length > 0 ? conversation!.messages![0].message : ""}</TableCell>
                <TableCell>
                <Button
                  variation="destructive"
                  onClick={() => handleDeleteConversation(conversation.conversationId)}
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
            setConversationId("");
            if (signOut) {
              signOut();
            }
            
          }}>Sign Out</Button>
        </Card>
        
                <Card>
          {conversationId &&  (
                <ConversationElement conversationId={conversationId}/>
              )}
           {!conversationId && (
          <View as="form" margin="3rem 0" onSubmit={(event) => handleCreateConversation(user, event)}>
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
