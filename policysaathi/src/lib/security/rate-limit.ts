import { type Collection } from 'mongodb'
import { getDb } from '@/lib/mongodb/client'

interface RateLimitEventDoc {
  key: string
  created_at: Date
  expires_at: Date
}

let indexEnsured = false

async function getRateLimitCollection(): Promise<Collection<RateLimitEventDoc>> {
  const db = await getDb()
  const collection = db.collection<RateLimitEventDoc>('rate_limit_events')
  if (!indexEnsured) {
    await collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
    indexEnsured = true
  }
  return collection
}

/**
 * Sliding-window rate limit backed by MongoDB (docs/specs/mongodb-schema.md's
 * rate_limit_events collection) — no Redis in this stack, so the window is
 * counted directly against recorded events rather than a fixed counter.
 *
 * Returns true if the caller is within the limit (and records this attempt),
 * false if the limit has already been reached for this key and window.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const collection = await getRateLimitCollection()
  const windowStart = new Date(Date.now() - windowSeconds * 1000)

  const attemptsInWindow = await collection.countDocuments({
    key,
    created_at: { $gte: windowStart },
  })

  if (attemptsInWindow >= maxAttempts) {
    return false
  }

  const now = new Date()
  await collection.insertOne({
    key,
    created_at: now,
    expires_at: new Date(now.getTime() + windowSeconds * 1000),
  })

  return true
}
