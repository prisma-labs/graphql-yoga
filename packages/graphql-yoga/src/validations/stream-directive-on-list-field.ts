import {
  ValidationContext,
  isListType,
  isWrappingType,
  DirectiveNode,
  ASTVisitor,
  GraphQLError,
} from 'graphql'
import { GraphQLStreamDirective } from '../directives/stream.js'

/**
 * Stream directive on list field
 *
 * A GraphQL document is only valid if stream directives are used on list fields.
 */
export function StreamDirectiveOnListFieldRule(
  context: ValidationContext,
): ASTVisitor {
  return {
    Directive(node: DirectiveNode) {
      const fieldDef = context.getFieldDef()
      const parentType = context.getParentType()
      if (
        fieldDef &&
        parentType &&
        node.name.value === GraphQLStreamDirective.name &&
        !(
          isListType(fieldDef.type) ||
          (isWrappingType(fieldDef.type) && isListType(fieldDef.type.ofType))
        )
      ) {
        context.reportError(
          new GraphQLError(
            `Stream directive cannot be used on non-list field "${fieldDef.name}" on type "${parentType.name}".`,
            { nodes: node },
          ),
        )
      }
    },
  }
}
