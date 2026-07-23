import { generateObject, jsonSchema } from 'ai'

// Claude Sonnet via the Vercel AI Gateway (plain model strings route through
// the gateway automatically when AI_GATEWAY_API_KEY is set).
const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL ?? 'anthropic/claude-sonnet-5'

export type ImageAnalysis = {
  title: string
  description: string
}

const analysisSchema = jsonSchema<ImageAnalysis>({
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A short, fun 2-5 word title for the drawing',
    },
    description: {
      type: 'string',
      description: '1-2 playful sentences describing what is in the drawing',
    },
  },
  required: ['title', 'description'],
  additionalProperties: false,
})

/**
 * Ask Claude to look at the attendee's drawing and describe what it sees.
 * Returns a short title (shown on the wall card) and a 1-2 sentence
 * description (shown in the detail modal).
 */
export async function analyzeAnimalImage(imageUrl: string): Promise<ImageAnalysis> {
  const { object } = await generateObject({
    model: ANALYSIS_MODEL,
    schema: analysisSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'This is a hand-drawn "party animal" from a conference attendee. Give it a short, fun title (2-5 words) and a playful 1-2 sentence description of what you see. Keep the vibe fun and energetic — this shows up on a public gallery wall.',
          },
          { type: 'image', image: new URL(imageUrl) },
        ],
      },
    ],
  })
  return object
}
