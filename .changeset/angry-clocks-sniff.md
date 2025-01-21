---
'@graphql-yoga/subscription': minor
---

Introduce new object based call signature for the `PubSub.subscribe` method.

```ts
import { createPubSub } from 'graphql-yoga'
import { SlidingBuffer } from '@repeaterjs/repeater'

const pubSub = createPubSub()

pubSub.subscribe({
  topic: "userChanged",
  id: "1",
  buffer: new SlidingBuffer()
})
```

Introduce new object based call signature for the `PubSub.publish` method.

```ts
import { createPubSub } from 'graphql-yoga'
import { SlidingBuffer } from '@repeaterjs/repeater'

const pubSub = createPubSub()

pubSub.publish({
  topic: "userChanged",
  id: "1",
})
```

For now, both the old and new call signatures will be supported, but we might consider only supporting the new call signature in a new major release.

Support providing a `RepeaterBuffer` to the `PubSub.subscribe` method, by using the new object based call signature.

```ts
import { createPubSub } from 'graphql-yoga'
import { SlidingBuffer } from '@repeaterjs/repeater'

const pubSub = createPubSub()

pubSub.subscribe({
  topic: "userChanged",
  id: "1",
  buffer: new SlidingBuffer(1_000)
})
```

Learn more about buffers on the [Repeater.js website](https://repeater.js.org/docs/safety#3-buffering-and-dropping-values).
