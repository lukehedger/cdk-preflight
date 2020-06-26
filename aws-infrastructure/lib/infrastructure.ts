import {
  Cors,
  Integration,
  IntegrationType,
  MethodLoggingLevel,
  RestApi,
} from "@aws-cdk/aws-apigateway";
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal,
} from "@aws-cdk/aws-iam";
import { Alias, Code, Function, Runtime, Tracing } from "@aws-cdk/aws-lambda";
import { Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const preflightFunctionName =
      process.env.ENVIRONMENT_NAME === "int"
        ? `PreflightFunction-${process.env.ENVIRONMENT_NAME}-${process.env.GITHUB_PR_NUMBER}`
        : `PreflightFunction-${process.env.ENVIRONMENT_NAME}`;

    const preflightFunction = new Function(this, preflightFunctionName, {
      code: Code.fromInline(
        `exports.handler = async () => { return { body: JSON.stringify({name: process.env.AWS_LAMBDA_FUNCTION_NAME, version: process.env.AWS_LAMBDA_FUNCTION_VERSION}), statusCode: 200}; }`
      ),
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.RETAIN,
      },
      functionName: preflightFunctionName,
      handler: "index.handler",
      runtime: Runtime.NODEJS_12_X,
      tracing: Tracing.ACTIVE,
    });

    const preflightFunctionAliasName = `${process.env.ENVIRONMENT_NAME}-${
      process.env.GITHUB_PR_NUMBER || "LATEST"
    }`;

    new Alias(this, preflightFunctionAliasName, {
      aliasName: preflightFunctionAliasName,
      version: preflightFunction.latestVersion,
    });

    const preflightAPIName =
      process.env.ENVIRONMENT_NAME === "int"
        ? `PreflightAPI-${process.env.ENVIRONMENT_NAME}-${process.env.GITHUB_PR_NUMBER}`
        : `PreflightAPI-${process.env.ENVIRONMENT_NAME}`;

    const preflightAPIStageName =
      process.env.ENVIRONMENT_NAME === "int"
        ? `${process.env.ENVIRONMENT_NAME}-${process.env.GITHUB_PR_NUMBER}`
        : `${process.env.ENVIRONMENT_NAME}`;

    const preflightAPI = new RestApi(this, preflightAPIName, {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      deployOptions: {
        dataTraceEnabled: true,
        loggingLevel: MethodLoggingLevel.ERROR,
        metricsEnabled: true,
        stageName: preflightAPIStageName,
        tracingEnabled: true,
        variables: {
          preflightFunction: `${preflightFunctionName}:${preflightFunctionAliasName}`,
        },
      },
      endpointExportName: preflightAPIName,
      policy: new PolicyDocument({
        assignSids: true,
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [new ServicePrincipal("apigateway.amazonaws.com")],
            resources: [
              `arn:aws:lambda:eu-west-2:614517326458:function:${preflightFunctionName}*`,
            ],
            actions: ["lambda:InvokeFunction"],
          }),
        ],
      }),
      restApiName: preflightAPIName,
      retainDeployments: true,
    });

    const preflightFunctionResource = preflightAPI.root.addResource(
      "preflight"
    );

    preflightFunctionResource.addMethod(
      "GET",
      new Integration({
        integrationHttpMethod: "GET",
        type: IntegrationType.AWS_PROXY,
        uri:
          "arn:aws:apigateway:eu-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-west-2:614517326458:function:${stageVariables.preflightFunction}/invocations",
      })
    );
  }
}
