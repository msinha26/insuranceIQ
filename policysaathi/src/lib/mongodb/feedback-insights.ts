import { chatMessagesCollection } from './collections'

export interface SimilarQuestionPattern {
  question: string
  rating: 'up' | 'down'
}

/**
 * Finds past user questions (across all users — not scoped to the current
 * policy or user) that are textually similar to the one being asked now,
 * and that received a thumbs up/down, via $text search + a join to
 * answer_feedback. Returns only the past QUESTION text and its rating —
 * never the stored answer content — so a signal from one user's feedback
 * can inform tone/approach for another user without ever exposing one
 * user's actual policy figures to another's chat context.
 */
export async function findSimilarQuestionPatterns(
  questionText: string,
  limit = 8
): Promise<SimilarQuestionPattern[]> {
  const trimmed = questionText.trim()
  if (!trimmed) return []

  const collection = await chatMessagesCollection()

  const results = await collection
    .aggregate<{ question: string; rating: 'up' | 'down' }>([
      { $match: { role: 'user', $text: { $search: trimmed } } },
      { $addFields: { score: { $meta: 'textScore' } } },
      { $sort: { score: -1 } },
      { $limit: 30 },
      {
        $lookup: {
          from: 'chat_messages',
          let: { sessionId: '$session_id', askedAt: '$created_at' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$session_id', '$$sessionId'] },
                    { $eq: ['$role', 'assistant'] },
                    { $gt: ['$created_at', '$$askedAt'] },
                  ],
                },
              },
            },
            { $sort: { created_at: 1 } },
            { $limit: 1 },
          ],
          as: 'reply',
        },
      },
      { $unwind: '$reply' },
      {
        $lookup: {
          from: 'answer_feedback',
          localField: 'reply._id',
          foreignField: 'message_id',
          as: 'feedback',
        },
      },
      { $unwind: '$feedback' },
      { $limit: limit },
      { $project: { _id: 0, question: '$content', rating: '$feedback.rating' } },
    ])
    .toArray()

  return results
}
