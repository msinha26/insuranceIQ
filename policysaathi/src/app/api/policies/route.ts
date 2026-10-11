import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { PDFDocument } from 'pdf-lib'
import { getSession } from '@/lib/auth/session'
import {
  policyTypeSchema,
  MAX_UPLOAD_FILE_SIZE_MB,
  MAX_POLICY_PAGE_COUNT,
  MAX_DOCUMENTS_PER_POLICY,
  mimeTypeToFileType,
  CURRENT_CONSENT_VERSION,
} from '@/lib/security/validate'
import { consentsCollection, policiesCollection, documentsCollection } from '@/lib/mongodb/collections'
import { withUserFilter } from '@/lib/security/tenant-filter'
import { uploadFileToGridFs } from '@/lib/gridfs/upload'
import { triggerIngestion } from '@/lib/n8n/ingestion'
import { logError } from '@/lib/security/sanitize-log'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  const userId = new ObjectId(session.user_id)

  try {
    const consents = await consentsCollection()
    const hasConsent = await consents.findOne({ user_id: userId, version: CURRENT_CONSENT_VERSION })
    if (!hasConsent) {
      return NextResponse.json(
        { code: 'consent_required', message: 'Please review and accept the consent screen first.' },
        { status: 403 }
      )
    }
  } catch (error) {
    logError('policies.upload.consent_check', error)
    return NextResponse.json({ code: 'internal_error', message: 'Something went wrong. Try again.' }, { status: 500 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ code: 'invalid_request', message: 'Expected multipart form data.' }, { status: 400 })
  }

  const policyTypeResult = policyTypeSchema.safeParse(formData.get('policy_type'))
  if (!policyTypeResult.success) {
    return NextResponse.json({ code: 'invalid_policy_type', message: 'Select a valid policy type.' }, { status: 400 })
  }
  const policyType = policyTypeResult.data

  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File)

  if (files.length === 0) {
    return NextResponse.json({ code: 'unsupported_type', message: 'Choose at least one file.' }, { status: 400 })
  }
  if (files.length > MAX_DOCUMENTS_PER_POLICY) {
    return NextResponse.json(
      { code: 'too_many_documents', message: `Upload up to ${MAX_DOCUMENTS_PER_POLICY} documents per policy.` },
      { status: 400 }
    )
  }

  const maxBytes = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024
  const preparedFiles: Array<{ file: File; buffer: Buffer; fileType: 'pdf' }> = []

  for (const file of files) {
    const fileType = mimeTypeToFileType(file.type)
    if (!fileType) {
      return NextResponse.json(
        { code: 'unsupported_type', message: 'Only PDF files are accepted.' },
        { status: 400 }
      )
    }
    if (file.size > maxBytes) {
      return NextResponse.json(
        { code: 'file_too_large', message: `Each file must be ${MAX_UPLOAD_FILE_SIZE_MB} MB or smaller.` },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      if (pdfDoc.getPageCount() > MAX_POLICY_PAGE_COUNT) {
        return NextResponse.json(
          { code: 'too_many_pages', message: `Policies can have up to ${MAX_POLICY_PAGE_COUNT} pages.` },
          { status: 422 }
        )
      }
    } catch (error) {
      logError('policies.upload.pdf_parse', error)
      return NextResponse.json(
        { code: 'unsupported_type', message: 'That PDF could not be read. Try a different file.' },
        { status: 400 }
      )
    }

    preparedFiles.push({ file, buffer, fileType })
  }

  const now = new Date()
  const policyId = new ObjectId()

  try {
    const policies = await policiesCollection()
    await policies.insertOne({
      _id: policyId,
      id: policyId.toHexString(),
      user_id: userId,
      policy_type: policyType,
      status: 'processing',
      created_at: now,
      updated_at: now,
    })

    const documents = await documentsCollection()
    const documentResults: Array<{ document_id: string; status: 'processing' }> = []

    for (const { file, buffer, fileType } of preparedFiles) {
      const gridfsFileId = await uploadFileToGridFs(file.name, file.type, buffer)
      const documentId = new ObjectId()

      await documents.insertOne({
        _id: documentId,
        id: documentId.toHexString(),
        policy_id: policyId,
        gridfs_file_id: gridfsFileId,
        file_type: fileType,
        doc_class: null,
        ocr_quality: [],
        unreadable_pages: [],
        status: 'processing',
        error: null,
        created_at: now,
        updated_at: now,
      })

      try {
        await triggerIngestion({
          user_id: userId.toHexString(),
          policy_id: policyId.toHexString(),
          document_id: documentId.toHexString(),
          file_base64: buffer.toString('base64'),
          file_type: fileType,
        })
      } catch (error) {
        logError('policies.upload.trigger_ingestion', error)
        await documents.updateOne(
          { _id: documentId },
          { $set: { status: 'failed', error: 'upstream_unavailable', updated_at: new Date() } }
        )
      }

      documentResults.push({ document_id: documentId.toHexString(), status: 'processing' })
    }

    return NextResponse.json({ policy_id: policyId.toHexString(), documents: documentResults })
  } catch (error) {
    logError('policies.upload', error)
    return NextResponse.json(
      { code: 'internal_error', message: 'Could not upload your policy. Try again.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  try {
    const policies = await policiesCollection()
    const userPolicies = await policies
      .find(withUserFilter(session.user_id, {}))
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      policies: userPolicies.map((policy) => ({
        id: policy._id.toHexString(),
        policy_type: policy.policy_type,
        status: policy.status,
        created_at: policy.created_at,
      })),
    })
  } catch (error) {
    logError('policies.list', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not load your policies.' }, { status: 500 })
  }
}
