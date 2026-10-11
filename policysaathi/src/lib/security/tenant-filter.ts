import { ObjectId } from 'mongodb'

/**
 * MongoDB has no row-level security — every query against a user-scoped
 * collection must include user_id (or a pre-verified owning policy_id) in
 * its filter, in application code, with no exceptions
 * (docs/specs/mongodb-schema.md). This is the single helper every route
 * uses so that rule lives in one place instead of being re-implemented
 * per route.
 */
export function withUserFilter<T extends Record<string, unknown>>(
  userId: string,
  filter: T
): T & { user_id: ObjectId } {
  return { ...filter, user_id: new ObjectId(userId) }
}
