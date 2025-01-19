import { GraphQLErrorExtensions } from 'graphql';
import { createGraphQLError } from '@graphql-tools/utils';
import { isGraphQLError } from '../error.js';
import { MaskError } from '../types.js';

export const maskError: MaskError = (
  error: unknown,
  message: string,
  isDev = globalThis.process?.env?.['NODE_ENV'] === 'development',
) => {
  if (isGraphQLError(error)) {
    if (error.originalError) {
      if (error.originalError.name === 'GraphQLError') {
        return error;
      }
      // Original error should be removed
      // @ts-expect-error - we are modifying the error
      const extensions: GraphQLErrorExtensions = (error.extensions ||= {});
      extensions['code'] ||= 'INTERNAL_SERVER_ERROR';
      extensions.unexpected = true;
      if (isDev) {
        extensions['originalError'] = {
          message: error.originalError.message,
          stack: error.originalError.stack,
        };
      }
      return createGraphQLError(message, {
        nodes: error.nodes,
        source: error.source,
        positions: error.positions,
        path: error.path,
        extensions,
      });
    }
    return error;
  }

  return createGraphQLError(message, {
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
      unexpected: true,
      originalError: isDev
        ? error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error
        : undefined,
    },
  });
};
