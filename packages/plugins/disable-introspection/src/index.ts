import type { Plugin, PromiseOrValue } from 'graphql-yoga'
import { NoSchemaIntrospectionCustomRule } from 'graphql'

type UseDisableIntrospectionArgs = {
  isDisabled?: (request: Request) => PromiseOrValue<boolean>
}

const store = new WeakMap<Request, boolean>()

export const useDisableIntrospection = (
  props?: UseDisableIntrospectionArgs,
): Plugin => {
  return {
    async onRequest({ request }) {
      const isDisabled = props?.isDisabled
        ? await props.isDisabled(request)
        : true
      store.set(request, isDisabled)
    },
    onValidate({ addValidationRule, context }) {
      console.log(store.get(context.request))
      const isDisabled = store.get(context.request) ?? true
      if (isDisabled) {
        addValidationRule(NoSchemaIntrospectionCustomRule)
      }
    },
  }
}
