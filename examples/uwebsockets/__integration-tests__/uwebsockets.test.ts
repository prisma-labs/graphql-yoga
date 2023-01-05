import { app } from '../src/app'
import { createServer, AddressInfo } from 'net'
import { us_listen_socket, us_listen_socket_close } from 'uWebSockets.js'
import { fetch } from '@whatwg-node/fetch'

describe('uWebSockets', () => {
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10)
  if (nodeMajor < 16) {
    it('should be skipped', () => {})
    return
  }
  let listenSocket: us_listen_socket
  let port: number
  beforeAll(async () => {
    port = await getPortFree()
    await new Promise<void>((resolve, reject) =>
      app.listen(port, (newListenSocket) => {
        listenSocket = newListenSocket
        if (listenSocket) {
          resolve()
          return
        }
        reject('Failed to start the server')
      }),
    )
  })
  afterAll(() => {
    if (listenSocket) {
      us_listen_socket_close(listenSocket)
    }
  })
  it('should show GraphiQL', async () => {
    const response = await fetch(`http://localhost:${port}/graphql`, {
      headers: {
        accept: 'text/html',
      },
    })
    const body = await response.text()
    expect(body).toContain('Yoga GraphiQL')
  })
  it('should handle queries', async () => {
    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            hello
          }
        `,
      }),
      headers: {
        'content-type': 'application/json',
      },
    })
    const body = await response.json()
    expect(body).toMatchObject({
      data: {
        hello: 'Hello world!',
      },
    })
  })
  async function getPortFree() {
    return new Promise<number>((res) => {
      const srv = createServer()
      srv.listen(0, () => {
        const port = (srv.address() as AddressInfo).port
        srv.close((err) => res(port))
      })
    })
  }
})
