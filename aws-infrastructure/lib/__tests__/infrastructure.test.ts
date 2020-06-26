import "@aws-cdk/assert/jest";
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../infrastructure";

let stack: InfrastructureStack;

beforeAll(() => {
  const app = new App();

  stack = new InfrastructureStack(app, "InfrastructureStack");
});

test("Stack has expected resources", () => {
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Code: {
      ZipFile:
        "exports.handler = async () => { return { body: JSON.stringify({name: process.env.AWS_LAMBDA_FUNCTION_NAME, version: process.env.AWS_LAMBDA_FUNCTION_VERSION}), statusCode: 200}; }",
    },
    Handler: "index.handler",
    Runtime: "nodejs12.x",
    FunctionName:
      process.env.ENVIRONMENT_NAME === "int"
        ? `PreflightFunction-${process.env.ENVIRONMENT_NAME}-${process.env.GITHUB_PR_NUMBER}`
        : `PreflightFunction-${process.env.ENVIRONMENT_NAME}`,
    TracingConfig: {
      Mode: "Active",
    },
  });

  expect(stack).toHaveResource("AWS::Lambda::Alias", {
    FunctionVersion: "$LATEST",
    Name: `${process.env.ENVIRONMENT_NAME}-${
      process.env.GITHUB_PR_NUMBER || "LATEST"
    }`,
  });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::RestApi", {
    Name:
      process.env.ENVIRONMENT_NAME === "int"
        ? `PreflightAPI-${process.env.ENVIRONMENT_NAME}-${process.env.GITHUB_PR_NUMBER}`
        : `PreflightAPI-${process.env.ENVIRONMENT_NAME}`,
    Policy: {
      Statement: [
        {
          Action: "lambda:InvokeFunction",
          Effect: "Allow",
          Principal: {
            Service: "apigateway.amazonaws.com",
          },
        },
      ],
    },
  });
});
