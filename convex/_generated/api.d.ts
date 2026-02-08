/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiActions from "../aiActions.js";
import type * as crons from "../crons.js";
import type * as eventActions from "../eventActions.js";
import type * as eventMutations from "../eventMutations.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as jwt from "../jwt.js";
import type * as monitoring from "../monitoring.js";
import type * as monitoringActions from "../monitoringActions.js";
import type * as monitoringMutations from "../monitoringMutations.js";
import type * as monitoringQueries from "../monitoringQueries.js";
import type * as schools from "../schools.js";
import type * as userSelections from "../userSelections.js";
import type * as users from "../users.js";
import type * as usersQueries from "../usersQueries.js";
import type * as verificationActions from "../verificationActions.js";
import type * as verificationFlow from "../verificationFlow.js";
import type * as verificationMutations from "../verificationMutations.js";
import type * as verificationTokens from "../verificationTokens.js";
import type * as whatsapp from "../whatsapp.js";
import type * as whatsappLogs from "../whatsappLogs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiActions: typeof aiActions;
  crons: typeof crons;
  eventActions: typeof eventActions;
  eventMutations: typeof eventMutations;
  health: typeof health;
  http: typeof http;
  jobs: typeof jobs;
  jwt: typeof jwt;
  monitoring: typeof monitoring;
  monitoringActions: typeof monitoringActions;
  monitoringMutations: typeof monitoringMutations;
  monitoringQueries: typeof monitoringQueries;
  schools: typeof schools;
  userSelections: typeof userSelections;
  users: typeof users;
  usersQueries: typeof usersQueries;
  verificationActions: typeof verificationActions;
  verificationFlow: typeof verificationFlow;
  verificationMutations: typeof verificationMutations;
  verificationTokens: typeof verificationTokens;
  whatsapp: typeof whatsapp;
  whatsappLogs: typeof whatsappLogs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
