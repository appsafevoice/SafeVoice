'use server'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt = body.prompt as string
    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'Missing Google AI API key' }, { status: 500 })
    }

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GOOGLE_AI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    const bodyText = await response.text()
    if (!response.ok) {
      const providerError = (() => {
        try {
          return JSON.parse(bodyText)?.error?.message as string | undefined
        } catch {
          return undefined
        }
      })()

      if (response.status === 401) {
        return NextResponse.json(
          {
            error: "Google AI rejected the API key. Create a Gemini API key in Google AI Studio and update GOOGLE_AI_API_KEY.",
          },
          { status: 502 },
        )
      }

      if (response.status === 429) {
        return NextResponse.json(
          { error: "Google AI request limit reached. Wait a moment, or check the project's Gemini quota and billing." },
          { status: 429 },
        )
      }

      return NextResponse.json(
        { error: providerError || `Google AI request failed (HTTP ${response.status}).` },
        { status: 502 },
      )
    }

    let data: any
    try {
      data = JSON.parse(bodyText)
    } catch {
      data = { text: bodyText }
    }

    const candidate = data?.candidates?.[0]
    const text =
      typeof candidate?.output === 'string' ? candidate.output :
      typeof candidate?.content === 'string' ? candidate.content :
      Array.isArray(candidate?.content)
        ? candidate.content.map((item: any) => item?.text).filter(Boolean).join('\n')
        : typeof candidate?.content?.text === 'string'
        ? candidate.content.text
        : Array.isArray(candidate?.content?.parts)
        ? candidate.content.parts.map((part: any) => part?.text).filter(Boolean).join('\n')
        : data?.output ||
      data?.text ||
      ''

    const recommendations = String(text)
      .split(/\n+/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)

    if (recommendations.length === 0) {
      return NextResponse.json({ error: 'AI request succeeded but returned no recommendations.', details: bodyText }, { status: 502 })
    }

    return NextResponse.json({ recommendations })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Unknown error' }, { status: 500 })
  }
}
