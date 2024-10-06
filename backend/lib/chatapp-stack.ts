import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as awsCognito from "aws-cdk-lib/aws-cognito";
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { Construct } from "constructs";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class ChatappStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

     // A Cognito User Pool
     const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true
      },
      autoVerify: {
        email: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true
        }
      },
      // lambdaTriggers: {
      //   preSignUp: this.presignupLambda
      // }
    });

    // Create Admin User Group
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admin'
    });

    // A Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: userPool,
      generateSecret: false
    });

    // Output the Cognito User Pool Id
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId
    });

    // Output the Cognito User Pool Client Id
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId
    });

    // Create an Identity Pool
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // Output the Cognito Identity Pool Id
    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
    });

    const bedrockLambda = new lambda.Function(this, "bedrockLambda", {
      functionName: "MyBedrockLambda",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "handlers/bedrocklambda")
      ),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(300),
    });

    bedrockLambda.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        resources: [
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-v2",
        ],
        actions: ["bedrock:InvokeModel"],
      })
    );

    // API handled by AppSync
    const api = new appsync.GraphqlApi(this, 'AppSyncApi', {
      name: 'AppsyncBedrockSample',
      definition: appsync.Definition.fromFile(
        path.join(__dirname, './schema.graphql')
      ),
      xrayEnabled: true,
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
            appIdClientRegex: userPoolClient.userPoolClientId
          }
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM
          }
        ]
      }
    });

    const table = new dynamodb.Table(this, 'Database', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING
      },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    // Predict Async Lambda
    const predictAsyncLambda = new NodejsFunction(this, 'PredictAsync', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambdas/predict/index.ts'),
      environment: {
        GRAPHQL_URL: api.graphqlUrl,
        TABLE_NAME: table.tableName
      },
      bundling: {
        nodeModules: ['langchain'],
        minify: true,
        sourceMap: true
      },
      memorySize: 756,
      timeout: cdk.Duration.seconds(60),
      role: new iam.Role(this, 'PredictAsyncRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole'
          )
        ]
      }),
      initialPolicy: [
        // Allow the lambda to call AppSync
        new iam.PolicyStatement({
          resources: [`${api.arn}/*`],
          actions: ['appsync:GraphQL']
        }),

        // Allow the lambda to use Bedrock:InvokeModel
        // so we can call the model endpoint.
        new iam.PolicyStatement({
          resources: ['*'],
          actions: [
            'bedrock:InvokeModel*'
          ]
        }),
      ],
      tracing: Tracing.ACTIVE
    });

    // Grant read/write data access to the DynamoDB table for the Lambda
    table.grantReadWriteData(predictAsyncLambda);

    /*================================= Data Sources =================================*/

    // Lambda Data Sources
    const predictAsyncDataSource = api.addLambdaDataSource(
      'PredictAsyncDataSource',
      predictAsyncLambda
    );

    // DynamoDB Data Sources
    const conversationHistoryDataSource =
      api.addDynamoDbDataSource(
        'ConversationHistoryDataSource',
        table
      );

    // None Data Sources
    const noneDataSource =
      api.addNoneDataSource('NoneDataSource');

    /*================================= Generic Functions =================================*/
    // These are used to create the resolver functions.

    // Pass Through Code - Used when no custom code is needed.
    // This is necessary for some pipelines resolvers where the first step is a lambda function.
    const passThroughCode = appsync.Code.fromAsset(
      path.join(__dirname, '../resolvers/util/pass-through.js')
    );

    // Input Pass Through Code - Same as passThroughCode, but specifically passes only the input
    // property to the payload. This is useful for subscriptions where the input is the only thing
    // that needs to be passed through.
    const payloadPassThroughCode = appsync.Code.fromAsset(
      path.join(__dirname, '../resolvers/util/input-pass-through.js')
    );

    /*================================= Functions =================================*/
    // These are the resolver functions that are type and field specific. e.g., createPersona, getThread, etc.

    const createResolverFunction = (
      name: string,
      dataSource: cdk.aws_appsync.DynamoDbDataSource | appsync.LambdaDataSource,
      codePath: string,
      runtime = appsync.FunctionRuntime.JS_1_0_0
    ) => {
      return new appsync.AppsyncFunction(this, name, {
        name,
        api: api,
        dataSource,
        code: appsync.Code.fromAsset(path.join(__dirname, codePath)),
        runtime
      });
    };

    const createLambdaFunction = (
      name: string,
      dataSource: cdk.aws_appsync.DynamoDbDataSource | appsync.LambdaDataSource,
      isAsync: boolean = false
    ) => {
      let props: any = {
        name,
        api: api,
        dataSource
      };
      if (isAsync) {
        props.requestMappingTemplate = appsync.MappingTemplate.fromString(`
          {
            "version": "2018-05-29",
            "operation": "Invoke",
            "payload": $util.toJson($context),
            "invocationType": "Event"
          }
        `);
        props.responseMappingTemplate = appsync.MappingTemplate.fromString('$util.toJson($context.result)');
      }
      return new appsync.AppsyncFunction(this, name, props);
    };

    // Threads

    const createThreadFunction = createResolverFunction(
      'createThread',
      conversationHistoryDataSource,
      '../resolvers/conversations/create-conversation.js'
    );
    const deleteThreadFunction = createResolverFunction(
      'deleteThread',
      conversationHistoryDataSource,
      '../resolvers/conversations/delete-conversation.js'
    );
    const getThreadFunction = createResolverFunction(
      'getThread',
      conversationHistoryDataSource,
      '../resolvers/conversations/get-conversation.js'
    );
    const getAllThreadsFunction = createResolverFunction(
      'getAllThreads',
      conversationHistoryDataSource,
      '../resolvers/conversations/get-conversations.js'
    );
    const threadSubscriptionFilter = appsync.Code.fromAsset(
      path.join(__dirname, '../resolvers/conversations/conversation-filter.js')
    );

    // Predict

    const predictAsyncFunction = createLambdaFunction(
      'PredictAsyncFunction',
      predictAsyncDataSource,
      true
    );

    /*================================= Resolvers =================================*/

    const resolverConfigs = [
      // Threads
      {
        typeName: 'Query',
        fieldName: 'getThread',
        pipelineConfig: [getThreadFunction]
      },
      {
        typeName: 'Query',
        fieldName: 'getAllThreads',
        pipelineConfig: [getAllThreadsFunction]
      },
      {
        typeName: 'Mutation',
        fieldName: 'createThread',
        pipelineConfig: [createThreadFunction]
      },
      {
        typeName: 'Mutation',
        fieldName: 'deleteThread',
        pipelineConfig: [deleteThreadFunction]
      },

      // Messages
      {
        typeName: 'Mutation',
        fieldName: 'createMessageAsync',
        pipelineConfig: [getThreadFunction, predictAsyncFunction],
      },

      // System
      {
        typeName: 'Mutation',
        fieldName: 'systemSendMessageChunk',
        runtime: appsync.FunctionRuntime.JS_1_0_0,
        code: payloadPassThroughCode,
        dataSource: noneDataSource
      },
      {
        typeName: 'Subscription',
        fieldName: 'recieveMessageChunkAsync',
        runtime: appsync.FunctionRuntime.JS_1_0_0,
        code: threadSubscriptionFilter,
        dataSource: noneDataSource
      }
    ];

    resolverConfigs.forEach((config) => {
      new appsync.Resolver(
        this,
        `${config.typeName}${config.fieldName}Resolver`,
        {
          api: api,
          typeName: config.typeName,
          fieldName: config.fieldName,
          pipelineConfig: config.pipelineConfig,
          runtime: appsync.FunctionRuntime.JS_1_0_0,
          code: config.code || passThroughCode,
          dataSource: config.dataSource
        }
      );
    });


    // Output the API Gateway endpoint URL
    new cdk.CfnOutput(this, 'GraphQLAPIURL', {
      value: api.graphqlUrl
    });

    
 }
}
