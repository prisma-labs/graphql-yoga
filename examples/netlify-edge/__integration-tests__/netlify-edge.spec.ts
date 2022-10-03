import yoga from '../src'
import { createServer, Server } from 'http'
import { AddressInfo } from 'net'
import { fetch } from '@whatwg-node/fetch'

describe('netlify-edge example integration', () => {
  it('should execute query', async () => {
    const response = await yoga.fetch(
      'http://yoga/graphql?query=query{greetings}',
    )
    const body = await response.json()
    expect(body.errors).toBeUndefined()
    expect(body.data).toMatchInlineSnapshot(`
      {
        "greetings": "This is the \`greetings\` field of the root \`Query\` type",
      }
    `)
  })
})
