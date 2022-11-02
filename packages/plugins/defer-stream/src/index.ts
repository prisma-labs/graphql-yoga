import { Plugin } from 'graphql-yoga'
import { GraphQLSchema, GraphQLDirective, specifiedRules } from 'graphql'
import { GraphQLDeferDirective } from './directives/defer.js'
import { GraphQLStreamDirective } from './directives/stream.js'
import { DeferStreamDirectiveLabelRule } from './validations/defer-stream-directive-label.js'
import { DeferStreamDirectiveOnRootFieldRule } from './validations/defer-stream-directive-on-root-field.js'
import { OverlappingFieldsCanBeMergedRule } from './validations/overlapping-fields-can-be-merged.js'
import { StreamDirectiveOnListFieldRule } from './validations/stream-directive-on-list-field.js'

export function useDeferStream<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TPluginContext extends Record<string, any>,
>(): Plugin<TPluginContext> {
  return {
    onSchemaChange: ({ schema, replaceSchema }) => {
      const directives: GraphQLDirective[] = []

      if (schema.getDirective('defer') == null) {
        directives.push(GraphQLDeferDirective)
      }
      if (schema.getDirective('stream') == null) {
        directives.push(GraphQLStreamDirective)
      }

      if (directives.length) {
        replaceSchema(
          new GraphQLSchema({
            ...schema.toConfig(),
            directives: [...schema.getDirectives(), ...directives],
          }),
        )
      }
    },
    onValidate: ({ validateFn, setValidationFn }) => {
      setValidationFn((schema, doc, _, ...rest) =>
        validateFn(
          schema,
          doc,
          [
            ...specifiedRules.filter(
              // We do not want to use the default one cause it does not account for `@defer` and `@stream`
              ({ name }) =>
                !['OverlappingFieldsCanBeMergedRule'].includes(name),
            ),
            OverlappingFieldsCanBeMergedRule,
            DeferStreamDirectiveOnRootFieldRule,
            DeferStreamDirectiveLabelRule,
            StreamDirectiveOnListFieldRule,
          ],
          rest,
        ),
      )
    },
  }
}
