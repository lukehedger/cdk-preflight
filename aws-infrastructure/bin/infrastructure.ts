#!/usr/bin/env node
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../lib/infrastructure";

const app = new App();

const infrastructureStackName =
  process.env.ENVIRONMENT_NAME === "int"
    ? `PreflightInfrastructure-${process.env.ENVIRONMENT_NAME}-${process.env.GITHUB_PR_NUMBER}`
    : `PreflightInfrastructure-${process.env.ENVIRONMENT_NAME}`;

new InfrastructureStack(app, infrastructureStackName);
