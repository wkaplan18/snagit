import OpenAI from 'openai'
import type { AISuggestion } from '@/types'

// Instantiated lazily so the app builds and runs without an OpenAI key (AI analysis disabled).
let openai: OpenAI | null = null
function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error('AI analysis is not configured (OPENAI_API_KEY missing)')
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

const SYSTEM_PROMPT = `You are a professional construction defect analyst specialising in residential snagging in South Africa.
Analyse construction site images and identify defects, damage, or incomplete workmanship.

Return ONLY valid JSON — no markdown, no explanation — in this exact format:
{
  "title": "Short defect title, max 6 words",
  "category": "one of: paint|crack|tile|water|fitting|alignment|finishing|electrical|plumbing|structural|carpentry|glazing|hvac|other",
  "description": "Professional 1-2 sentence defect description for a snagging report",
  "confidence": 0.0
}

Confidence is 0.0–1.0 reflecting how clearly a defect is visible.
If no defect is visible return confidence 0.1 and category "other".`

export async function analyseDefectImage(imageUrl: string): Promise<AISuggestion> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'high' },
          },
          {
            type: 'text',
            text: 'Analyse this construction site image for defects.',
          },
        ],
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(raw) as AISuggestion
    return {
      title: parsed.title ?? 'Construction defect',
      category: parsed.category ?? 'other',
      description: parsed.description ?? '',
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
    }
  } catch {
    return {
      title: 'Construction defect',
      category: 'other',
      description: 'Defect identified. Please add a manual description.',
      confidence: 0.3,
    }
  }
}
