import request from 'supertest'
import { buildApp } from '../src/app'

describe('fastify example integration', () => {
  const app = buildApp()

  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('sends GraphiQL', async () => {
    const response = await request(app.server).get('/graphql').set({
      accept: 'text/html',
    })

    expect(response.statusCode).toEqual(200)
    expect(response.text).toContain('<title>GraphiQL</title>')
  })

  it('handles query operation via POST', async () => {
    const response = await request(app.server)
      .post('/graphql')
      .set({ 'content-type': 'application/json' })
      .send(
        JSON.stringify({
          query: /* GraphQL */ `
            query {
              __typename
            }
          `,
        }),
      )

    expect(response.statusCode).toEqual(200)
    expect(response.body).toStrictEqual({
      data: {
        __typename: 'Query',
      },
    })
  })

  it('handles query operation via GET', async () => {
    const response = await request(app.server)
      .get('/graphql')
      .query({
        query: /* GraphQL */ `
          query {
            __typename
          }
        `,
      })

    expect(response.statusCode).toEqual(200)
    expect(response.body).toStrictEqual({
      data: {
        __typename: 'Query',
      },
    })
  })

  it('handles mutation operation via POST', async () => {
    const response = await request(app.server)
      .post('/graphql')
      .set({ 'content-type': 'application/json' })
      .send(
        JSON.stringify({
          query: /* GraphQL */ `
            mutation {
              __typename
            }
          `,
        }),
      )

    expect(response.statusCode).toEqual(200)
    expect(response.body).toStrictEqual({
      data: {
        __typename: 'Mutation',
      },
    })
  })

  it.skip('rejects mutation operation via GET with an useful error message', async () => {
    const response = await request(app.server)
      .get('/graphql')
      .query({
        query: /* GraphQL */ `
          mutation {
            __typename
          }
        `,
      })

    expect(response.statusCode).toEqual(405)
    expect(response.body).toStrictEqual({
      errors: [
        {
          message: "Cannot process mutation operations via 'POST' HTTP verb.",
        },
      ],
    })
  })

  it('handles subscription operations via GET', async () => {
    const response = await request(app.server)
      .get('/graphql')
      .set({ accept: 'text/event-stream' })
      .query({
        query: /* GraphQL */ `
          subscription {
            countdown(from: 10, interval: 1)
          }
        `,
      })
    expect(response.statusCode).toEqual(200)
    expect(response.text).toMatchInlineSnapshot(`
      "data: {\\"data\\":{\\"countdown\\":10}}

      data: {\\"data\\":{\\"countdown\\":9}}

      data: {\\"data\\":{\\"countdown\\":8}}

      data: {\\"data\\":{\\"countdown\\":7}}

      data: {\\"data\\":{\\"countdown\\":6}}

      data: {\\"data\\":{\\"countdown\\":5}}

      data: {\\"data\\":{\\"countdown\\":4}}

      data: {\\"data\\":{\\"countdown\\":3}}

      data: {\\"data\\":{\\"countdown\\":2}}

      data: {\\"data\\":{\\"countdown\\":1}}

      data: {\\"data\\":{\\"countdown\\":0}}

      "
    `)
  })
  it('handles subscription operations via POST', async () => {
    const response = await request(app.server)
      .post('/graphql')
      .set({
        accept: 'text/event-stream',
        'content-type': 'application/json',
      })
      .send({
        query: /* GraphQL */ `
          subscription {
            countdown(from: 10, interval: 1)
          }
        `,
      })
    expect(response.statusCode).toEqual(200)
    expect(response.text).toMatchInlineSnapshot(`
      "data: {\\"data\\":{\\"countdown\\":10}}

      data: {\\"data\\":{\\"countdown\\":9}}

      data: {\\"data\\":{\\"countdown\\":8}}

      data: {\\"data\\":{\\"countdown\\":7}}

      data: {\\"data\\":{\\"countdown\\":6}}

      data: {\\"data\\":{\\"countdown\\":5}}

      data: {\\"data\\":{\\"countdown\\":4}}

      data: {\\"data\\":{\\"countdown\\":3}}

      data: {\\"data\\":{\\"countdown\\":2}}

      data: {\\"data\\":{\\"countdown\\":1}}

      data: {\\"data\\":{\\"countdown\\":0}}

      "
    `)
  })
})
