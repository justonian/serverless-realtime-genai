import { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda';
import { updateConversationStatus, addMessage} from './dynamodb';
import { processSingleEvent } from './logic';
import { MessageSystemStatus } from './types';


const {
    TABLE_NAME = '',
  } = process.env;


export async function handler() {
}
