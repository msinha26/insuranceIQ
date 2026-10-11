import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB_NAME || 'policysaathi'

declare global {
  // eslint-disable-next-line no-var
  var __policysaathiMongoClientPromise: Promise<MongoClient> | undefined
}

// Deliberately an async function, not a plain function returning a Promise —
// thrown inside an async function, "missing URI" becomes a REJECTED promise
// rather than a synchronous exception. A synchronous throw here would crash
// module evaluation itself, outside any route handler's try/catch; a
// rejected promise only surfaces when something awaits it, which happens
// inside getDb(), called from within every route handler's own try/catch —
// so the failure is always caught the same way, not dependent on whether
// this module had already been evaluated by the time a request arrives.
async function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable')
  }
  const client = new MongoClient(uri)
  return client.connect()
}

// Reuse the connection across hot reloads in development so we don't open a
// new MongoDB connection on every file save.
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  if (!global.__policysaathiMongoClientPromise) {
    global.__policysaathiMongoClientPromise = createClientPromise()
  }
  clientPromise = global.__policysaathiMongoClientPromise
} else {
  clientPromise = createClientPromise()
}

export async function getDb(): Promise<Db> {
  try {
    const client = await clientPromise
    return client.db(dbName)
  } catch (error) {
    // Don't let one failed attempt (missing config, or a transient network
    // issue) permanently poison the cached promise for the rest of this
    // process's lifetime — queue a fresh attempt for the next call. The
    // current call still fails and propagates the real error.
    clientPromise = createClientPromise()
    if (process.env.NODE_ENV === 'development') {
      global.__policysaathiMongoClientPromise = clientPromise
    }
    throw error
  }
}
