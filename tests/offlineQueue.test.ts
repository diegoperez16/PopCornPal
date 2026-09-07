import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createOfflineQueue,
  type OwnedQueueItem,
} from '../src/lib/offlineQueueCore.ts'
import { createAccountScope } from '../src/lib/accountScope.ts'
import { isAuthError, isNetworkError } from '../src/lib/requestErrors.ts'

function setup() {
  const records = new Map<string, OwnedQueueItem[]>()
  let transaction = Promise.resolve()
  const queue = createOfflineQueue<OwnedQueueItem>({
    read: async (userId) => structuredClone(records.get(userId) ?? []),
    update(userId, transform) {
      transaction = transaction.then(() => {
        records.set(userId, transform(records.get(userId) ?? []))
      })
      return transaction
    },
  })
  return { queue, records }
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('concurrent offline saves preserve every change', async () => {
  const { queue } = setup()
  await Promise.all(
    Array.from({ length: 50 }, (_, index) =>
      queue.enqueue({ id: String(index), userId: 'alice' })
    )
  )
  assert.equal((await queue.read('alice')).length, 50)
})

test('a flush acknowledgment preserves changes enqueued during a network request', async () => {
  const { queue } = setup()
  await queue.enqueue({ id: 'original', userId: 'alice' })
  const started = deferred()
  const response = deferred()
  const flushing = queue.flush(
    'alice',
    () => true,
    async () => {
      started.resolve()
      await response.promise
    }
  )
  await started.promise
  await queue.enqueue({ id: 'new', userId: 'alice' })
  response.resolve()
  assert.deepEqual(await flushing, { flushed: 1 })
  assert.deepEqual(await queue.read('alice'), [{ id: 'new', userId: 'alice' }])
})

test('replay only reads the signed-in account partition', async () => {
  const { queue } = setup()
  await queue.enqueue({ id: 'alice-draft', userId: 'alice' })
  await queue.enqueue({ id: 'bob-draft', userId: 'bob' })
  const executed: string[] = []
  await queue.flush(
    'bob',
    () => true,
    async (item) => {
      executed.push(item.id)
    }
  )
  assert.deepEqual(executed, ['bob-draft'])
  assert.equal((await queue.read('alice')).length, 1)
})

test('auth or permanent server errors preserve failed work and dependent changes', async () => {
  for (const error of [
    { status: 401 },
    { code: '23503', message: 'Foreign key violation' },
  ]) {
    const { queue } = setup()
    await queue.enqueue({ id: 'parent', userId: 'alice' })
    await queue.enqueue({ id: 'reply', userId: 'alice' })
    let attempts = 0
    const result = await queue.flush(
      'alice',
      () => true,
      async () => {
        attempts += 1
        throw error
      }
    )
    assert.equal(result.flushed, 0)
    assert.equal(result.error, error)
    assert.equal(attempts, 1)
    assert.equal((await queue.read('alice')).length, 2)
  }
})

test('sign-out during a flush stops subsequent writes, even after signing back into the same account', async () => {
  const { queue } = setup()
  const scope = createAccountScope()
  scope.set('alice')
  const snapshot = scope.capture()
  await queue.enqueue({ id: 'first', userId: 'alice' })
  await queue.enqueue({ id: 'second', userId: 'alice' })
  const result = await queue.flush(
    'alice',
    () => scope.isCurrent(snapshot),
    async () => {
      scope.set(null)
      scope.set('alice')
    }
  )
  assert.equal(result.flushed, 1)
  assert.deepEqual(
    (await queue.read('alice')).map((item) => item.id),
    ['second']
  )
})

test('simultaneous reconnect triggers share one replay operation', async () => {
  const { queue } = setup()
  await queue.enqueue({ id: 'draft', userId: 'alice' })
  const response = deferred()
  let requests = 0
  const run = async () => {
    requests += 1
    await response.promise
  }
  const first = queue.flush('alice', () => true, run)
  const second = queue.flush('alice', () => true, run)
  assert.equal(first, second)
  response.resolve()
  await Promise.all([first, second])
  assert.equal(requests, 1)
})

test('malformed cross-account records cannot execute', async () => {
  const { queue, records } = setup()
  records.set('alice', [{ id: 'bob-draft', userId: 'bob' }])
  let requests = 0
  const result = await queue.flush(
    'alice',
    () => true,
    async () => {
      requests += 1
    }
  )
  assert.equal(requests, 0)
  assert.ok(result.error)
  assert.equal((await queue.read('alice')).length, 1)
})

test('a delayed profile or cache response cannot pass a newer identity generation', () => {
  const scope = createAccountScope()
  scope.set('alice')
  const alice = scope.capture()
  scope.set('bob')
  assert.equal(scope.isCurrent(alice), false)
  const bob = scope.capture()
  scope.set('bob')
  assert.equal(scope.isCurrent(bob), true)
})

test('Supabase plain error records classify the same as Error instances', () => {
  assert.equal(isNetworkError({ message: 'TypeError: Failed to fetch' }), true)
  assert.equal(isNetworkError(new Error('Network unavailable')), true)
  assert.equal(isNetworkError({ message: 'Permission denied' }), false)
  assert.equal(isAuthError({ code: 'PGRST303' }), true)
  assert.equal(isAuthError({ status: 401 }), true)
  assert.equal(isAuthError(null), false)
})
