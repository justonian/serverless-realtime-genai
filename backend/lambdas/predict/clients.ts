import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import * as AWSXRay from 'aws-xray-sdk';
import * as http from 'http';
import * as https from 'https';

// Clients
const dynamodbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient());

// Http clients
const httpClient = AWSXRay.captureHTTPs(http);
const httpsClient = AWSXRay.captureHTTPs(https);

export {
  dynamodbClient,
  httpClient,
  httpsClient
};
