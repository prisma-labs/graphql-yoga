import { DocumentNode, getOperationAST, GraphQLError, OperationDefinitionNode } from 'graphql';
import { Maybe } from '@envelop/core';
import { createGraphQLError } from '@graphql-tools/utils';
import type { YogaInitialContext } from '../../types.js';
import type { Plugin } from '../types.js';

export function assertMutationViaGet(
  method: string,
  document: Maybe<DocumentNode>,
  operationName?: string,
) {
  const operation: OperationDefinitionNode | undefined = document
    ? (getOperationAST(document, operationName) ?? undefined)
    : undefined;

  if (operation?.operation === 'mutation' && method === 'GET') {
    throw createGraphQLError('Can only perform a mutation operation from a POST request.', {
      extensions: {
        http: {
          status: 405,
          headers: {
            Allow: 'POST',
          },
        },
      },
    });
  }
}

export function usePreventMutationViaGET(): Plugin<YogaInitialContext> {
  return {
    onParse() {
      // We should improve this by getting Yoga stuff from the hook params directly instead of the context
      return ({
        result,
        context: {
          request,
          // the `params` might be missing in cases where the user provided
          // malformed context to getEnveloped (like `yoga.getEnveloped({})`)
          params: { operationName } = {},
        },
      }) => {
        // Run only if this is a Yoga request
        // the `request` might be missing when using graphql-ws for example
        // in which case throwing an error would abruptly close the socket
        if (!request) {
          return;
        }

        if (result instanceof Error) {
          if (result instanceof GraphQLError) {
            result.extensions['http'] = {
              spec: true,
              status: 400,
            };
          }
          throw result;
        }

        assertMutationViaGet(request.method, result, operationName);
      };
    },
  };
}
