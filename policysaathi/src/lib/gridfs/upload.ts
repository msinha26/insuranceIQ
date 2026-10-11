import { GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'node:stream'
import { getDb } from '@/lib/mongodb/client'

const BUCKET_NAME = 'policyDocuments'

async function getBucket(): Promise<GridFSBucket> {
  const db = await getDb()
  return new GridFSBucket(db, { bucketName: BUCKET_NAME })
}

/**
 * Stores a file in GridFS and returns its id. Used instead of a plain
 * Binary field because policy files can be up to 20 MB — past MongoDB's
 * 16 MB single-document limit (docs/specs/mongodb-schema.md).
 */
export async function uploadFileToGridFs(
  filename: string,
  contentType: string,
  data: Buffer
): Promise<ObjectId> {
  const bucket = await getBucket()

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
    })

    uploadStream.once('error', reject)
    uploadStream.once('finish', () => resolve(uploadStream.id as ObjectId))

    Readable.from(data).pipe(uploadStream)
  })
}

export async function deleteFileFromGridFs(fileId: ObjectId): Promise<void> {
  const bucket = await getBucket()
  await bucket.delete(fileId)
}
