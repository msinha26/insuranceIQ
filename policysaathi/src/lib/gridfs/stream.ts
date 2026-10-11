import { GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web'
import { getDb } from '@/lib/mongodb/client'

const BUCKET_NAME = 'policyDocuments'

export interface GridFsFile {
  stream: ReadableStream
  contentType: string
  length: number
  filename: string
}

/**
 * Opens a GridFS file for streaming to an HTTP response. Used by the
 * authenticated file route (docs/specs/upload-api.md) — GridFS has no
 * signed-URL concept, so every fetch re-authenticates and streams fresh.
 */
export async function openGridFsDownloadStream(fileId: ObjectId): Promise<GridFsFile | null> {
  const db = await getDb()
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })

  const [fileInfo] = await bucket.find({ _id: fileId }).toArray()
  if (!fileInfo) {
    return null
  }

  const nodeStream = bucket.openDownloadStream(fileId)
  const webStream = Readable.toWeb(nodeStream) as unknown as NodeWebReadableStream

  return {
    stream: webStream as unknown as ReadableStream,
    contentType: fileInfo.contentType ?? 'application/octet-stream',
    length: fileInfo.length,
    filename: fileInfo.filename ?? 'document',
  }
}
