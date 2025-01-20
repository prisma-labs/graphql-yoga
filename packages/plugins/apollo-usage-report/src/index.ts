import { DocumentNode, getOperationAST, Kind, printSchema, stripIgnoredCharacters } from 'graphql';
import {
  isAsyncIterable,
  YogaLogger,
  YogaServer,
  type FetchAPI,
  type Maybe,
  type Plugin,
  type PromiseOrValue,
  type YogaInitialContext,
} from 'graphql-yoga';
import { Report } from '@apollo/usage-reporting-protobuf';
import {
  ApolloInlineGraphqlTraceContext,
  ApolloInlineRequestTraceContext,
  ApolloInlineTracePluginOptions,
  useApolloInstrumentation,
} from '@graphql-yoga/plugin-apollo-inline-trace';

type ApolloUsageReportOptions = ApolloInlineTracePluginOptions & {
  /**
   * The graph ref of the managed federation graph.
   * It is composed of the graph ID and the variant (`<YOUR_GRAPH_ID>@<VARIANT>`).
   *
   * If not provided, `APOLLO_GRAPH_REF` environment variable is used.
   *
   * You can find a a graph's ref at the top of its Schema Reference page in Apollo Studio.
   */
  graphRef?: string;
  /**
   * The API key to use to authenticate with the managed federation up link.
   * It needs at least the `service:read` permission.
   *
   * If not provided, `APOLLO_KEY` environment variable will be used instead.
   *
   * [Learn how to create an API key](https://www.apollographql.com/docs/federation/v1/managed-federation/setup#4-connect-the-gateway-to-studio)
   */
  apiKey?: string;
  /**
   * Usage report endpoint
   *
   * Defaults to GraphOS endpoint (https://usage-reporting.api.apollographql.com/api/ingress/traces)
   */
  endpoint?: string;
  /**
   * Agent Version to report to the usage reporting API
   */
  agentVersion?: string;
  /**
   * Client name to report to the usage reporting API
   */
  clientName?: StringFromRequestFn;
  /**
   * Client version to report to the usage reporting API
   */
  clientVersion?: StringFromRequestFn;
};

export interface ApolloUsageReportRequestContext extends ApolloInlineRequestTraceContext {
  traces: Map<YogaInitialContext, ApolloUsageReportGraphqlContext>;
}

export interface ApolloUsageReportGraphqlContext extends ApolloInlineGraphqlTraceContext {
  operationKey?: string;
  schemaId?: string;
}

function getEnvVar<T>(name: string, defaultValue?: T) {
  return globalThis.process?.env?.[name] || defaultValue || undefined;
}

const DEFAULT_REPORTING_ENDPOINT =
  'https://usage-reporting.api.apollographql.com/api/ingress/traces';

type StringFromRequestFn = (req: Request) => Maybe<string>;

export function useApolloUsageReport(options: ApolloUsageReportOptions = {}): Plugin {
  const [instrumentation, ctxForReq] = useApolloInstrumentation(options) as [
    Plugin,
    WeakMap<Request, ApolloUsageReportRequestContext>,
  ];

  let schemaIdSet$: Promise<void> | undefined;
  let schemaId: string;
  let yoga: YogaServer<Record<string, unknown>, Record<string, unknown>>;
  const logger = Object.fromEntries(
    (['error', 'warn', 'info', 'debug'] as const).map(level => [
      level,
      (...messages: unknown[]) => yoga.logger[level]('[ApolloUsageReport]', ...messages),
    ]),
  ) as YogaLogger;

  let clientNameFactory: StringFromRequestFn = req => req.headers.get('apollographql-client-name');
  if (typeof options.clientName === 'function') {
    clientNameFactory = options.clientName;
  }

  let clientVersionFactory: StringFromRequestFn = req =>
    req.headers.get('apollographql-client-version');
  if (typeof options.clientVersion === 'function') {
    clientVersionFactory = options.clientVersion;
  }

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(instrumentation);
      addPlugin({
        onYogaInit(args) {
          yoga = args.yoga;

          if (!getEnvVar('APOLLO_KEY', options.apiKey)) {
            throw new Error(
              `[ApolloUsageReport] Missing API key. Please provide one in plugin options or with 'APOLLO_KEY' environment variable.`,
            );
          }

          if (!getEnvVar('APOLLO_GRAPH_REF', options.graphRef)) {
            throw new Error(
              `[ApolloUsageReport] Missing Graph Ref. Please provide one in plugin options or with 'APOLLO_GRAPH_REF' environment variable.`,
            );
          }
        },
        onSchemaChange({ schema }) {
          if (schema) {
            schemaIdSet$ = hashSHA256(printSchema(schema), yoga.fetchAPI).then(id => {
              schemaId = id;
              schemaIdSet$ = undefined;
            });
          }
        },

        onRequestParse(): PromiseOrValue<void> {
          return schemaIdSet$;
        },

        onParse() {
          return function onParseEnd({ result, context }) {
            const ctx = ctxForReq.get(context.request)?.traces.get(context);
            if (!ctx) {
              logger.debug(
                'operation tracing context not found, this operation will not be traced.',
              );
              return;
            }

            const operationName =
              context.params.operationName ??
              (isDocumentNode(result) ? getOperationAST(result)?.name?.value : undefined);
            const signature = context.params.query
              ? stripIgnoredCharacters(context.params.query)
              : '';

            ctx.operationKey = `# ${operationName || '-'}\n${signature}`;
            ctx.schemaId = schemaId;
          };
        },

        onResultProcess({ request, result, serverContext }) {
          // TODO: Handle async iterables ?
          if (isAsyncIterable(result)) {
            logger.debug('async iterable results not implemented for now');
            return;
          }

          const reqCtx = ctxForReq.get(request);
          if (!reqCtx) {
            logger.debug('operation tracing context not found, this operation will not be traced.');
            return;
          }

          // Each operation in a batched request can belongs to a different schema.
          // Apollo doesn't allow to send batch queries for multiple schemas in the same batch
          const tracesPerSchema: Record<string, Report['tracesPerQuery']> = {};

          for (const trace of reqCtx.traces.values()) {
            if (!trace.schemaId || !trace.operationKey) {
              logger.debug('Misformed trace, missing operation key or schema id');
              continue;
            }

            const clientName = clientNameFactory(request);
            if (clientName) {
              trace.trace.clientName = clientName;
            }

            const clientVersion = clientVersionFactory(request);
            if (clientVersion) {
              trace.trace.clientVersion = clientVersion;
            }

            tracesPerSchema[trace.schemaId] ||= {};
            tracesPerSchema[trace.schemaId]![trace.operationKey] ||= { trace: [] };
            tracesPerSchema[trace.schemaId]![trace.operationKey]!.trace?.push(trace.trace);
          }

          for (const schemaId in tracesPerSchema) {
            const tracesPerQuery = tracesPerSchema[schemaId]!;
            const agentVersion = options.agentVersion || `graphql-yoga@${yoga.version}`;
            serverContext.waitUntil(
              sendTrace(
                options,
                logger,
                yoga.fetchAPI.fetch,
                schemaId,
                tracesPerQuery,
                agentVersion,
              ),
            );
          }
        },
      });
    },
  };
}

export async function hashSHA256(
  str: string,
  api: {
    crypto: Crypto;
    TextEncoder: (typeof globalThis)['TextEncoder'];
  } = globalThis,
) {
  const { crypto, TextEncoder } = api;
  const textEncoder = new TextEncoder();
  const utf8 = textEncoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  let hashHex = '';
  for (const bytes of new Uint8Array(hashBuffer)) {
    hashHex += bytes.toString(16).padStart(2, '0');
  }
  return hashHex;
}

async function sendTrace(
  options: ApolloUsageReportOptions,
  logger: YogaLogger,
  fetch: FetchAPI['fetch'],
  schemaId: string,
  tracesPerQuery: Report['tracesPerQuery'],
  agentVersion: string,
) {
  const {
    graphRef = getEnvVar('APOLLO_GRAPH_REF'),
    apiKey = getEnvVar('APOLLO_KEY'),
    endpoint = DEFAULT_REPORTING_ENDPOINT,
  } = options;

  try {
    const body = Report.encode({
      header: {
        agentVersion,
        graphRef,
        executableSchemaId: schemaId,
      },
      operationCount: 1,
      tracesPerQuery,
    }).finish();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/protobuf',
        // The presence of the api key is already checked at Yoga initialization time

        'x-api-key': apiKey!,
        accept: 'application/json',
      },
      body,
    });
    const responseText = await response.text();
    if (response.ok) {
      logger.debug('Traces sent:', responseText);
    } else {
      logger.error('Failed to send trace:', responseText);
    }
  } catch (err) {
    logger.error('Failed to send trace:', err);
  }
}

function isDocumentNode(data: unknown): data is DocumentNode {
  const isObject = (data: unknown): data is Record<string, unknown> =>
    !!data && typeof data === 'object';

  return isObject(data) && data['kind'] === Kind.DOCUMENT;
}
