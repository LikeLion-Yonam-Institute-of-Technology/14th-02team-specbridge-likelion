import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { z } from 'zod'
import { zodTextFormat } from 'openai/helpers/zod'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT || 3001)
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

const AnalysisOutputSchema = z.object({
  category: z.string().min(1),
  terms: z
    .array(
      z.object({
        term: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .default([]),
  easySentence: z.string().min(1),
  actions: z.array(z.string()).default([]),
})

const MeetingSummarySchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(z.string()).default([]),
  tasks: z
    .array(
      z.object({
        person: z.string().default(''),
        task: z.string().default(''),
      }),
    )
    .default([]),
  schedules: z
    .array(
      z.object({
        item: z.string().default(''),
        date: z.string().default(''),
      }),
    )
    .default([]),
  terms: z
    .array(
      z.object({
        term: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .default([]),
  questions: z.array(z.string()).default([]),
})

const normalizeCategory = (categoryValue) => {
  if (typeof categoryValue !== 'string') {
    return 'auto'
  }

  const trimmed = categoryValue.trim()
  return trimmed || 'auto'
}

const normalizeLevel = (levelValue) => {
  const value = String(levelValue ?? 'basic').trim().toLowerCase()

  if (['simple', '간단하게', '간단', 'short'].includes(value)) {
    return 'simple'
  }

  if (['detail', '자세하게', '상세', 'detailed'].includes(value)) {
    return 'detail'
  }

  return 'basic'
}

const buildSystemPrompt = (selectedCategory, level) => {
  const levelInstructions = {
    simple:
      '비전공자도 바로 이해할 수 있도록 매우 짧고 쉽고 명확하게 설명하세요. 전문용어가 있더라도 필요한 경우만 최소한으로 설명하고 핵심 의미를 1~2문장으로 전달하세요.',
    basic:
      '쉬운 정의와 현재 문장에서의 의미를 함께 설명하세요. 전문용어는 필요한 경우만 간단히 설명하고 전체 내용을 쉽게 이해할 수 있게 작성하세요.',
    detail:
      '정의, 현재 문맥에서의 의미, 실제 사용 예시까지 자세하게 설명하세요. 전문용어의 뜻과 왜 중요한지까지 포함해 이해를 도와주세요.',
  }

  const categoryInstruction =
    selectedCategory && selectedCategory !== 'auto'
      ? `사용자가 선택한 분야는 "${selectedCategory}" 입니다. 이 분야 기준으로 분석하고 설명하세요.`
      : '문맥을 보고 전문 분야를 자동으로 감지한 뒤, 그 분야 기준으로 분석하고 설명하세요.'

  return `당신은 한국어 전문어 설명 도우미입니다.
- 반드시 JSON 형식으로만 응답하세요.
- ${categoryInstruction}
- 설명 수준: ${levelInstructions[level] || levelInstructions.basic}
- 전문용어가 없으면 terms를 빈 배열로 반환하세요.
- 실제로 해야 할 행동이 없으면 actions를 빈 배열로 반환하세요. 억지로 행동을 만들지 마세요.
- 전체 문장은 한국어로 설명하세요.
- category는 감지된 분야를 한 줄짜리 문자열로 작성하세요.
- easySentence는 전체 문장을 쉬운 표현으로 바꾼 내용을 한국어로 작성하세요.
- terms 배열의 각 항목은 {"term": "전문용어", "description": "쉬운 설명"} 형태여야 합니다.
- actions 배열의 요소는 사용자가 이해하거나 해야 할 핵심 내용만 포함하세요.
- 결과는 반드시 아래 JSON 구조를 만족해야 합니다:
{
  "category": "감지된 분야",
  "terms": [{ "term": "전문용어", "description": "쉬운 설명" }],
  "easySentence": "전체 문장을 쉬운 표현으로 바꾼 내용",
  "actions": ["핵심 내용"]
}`
}

const buildMeetingSummaryPrompt = () => `당신은 회의록을 정리하는 한국어 비서입니다.
- 반드시 JSON 형식으로만 응답하세요.
- 회의 내용에서 명확하게 드러난 정보만 사용하세요.
- 회의에 존재하지 않는 담당자, 일정, 결정사항, 전문용어, 질문을 임의로 만들어내지 마세요.
- 정보가 전혀 없다면 해당 배열은 빈 배열로 반환하세요.
- tasks는 각 항목을 {"person": "담당자", "task": "해야 할 일"} 형식으로 작성하세요.
- schedules는 각 항목을 {"item": "일정 내용", "date": "언급된 일정"} 형식으로 작성하세요.
- terms는 전문용어가 있을 때만 배열에 넣고, 없으면 []로 반환하세요.
- questions는 추가로 확인해야 할 내용이 있을 때만 넣고, 없으면 []로 반환하세요.
- summary는 회의 전체 내용을 한 줄로 요약한 한국어 문장이어야 합니다.
- decisions는 핵심 결정 사항만 문자열 배열로 작성하세요.
- 최종 결과는 반드시 아래 구조를 따라야 합니다:
{
  "summary": "회의 한 줄 요약",
  "decisions": ["주요 결정 사항"],
  "tasks": [{ "person": "담당자", "task": "해야 할 일" }],
  "schedules": [{ "item": "일정 내용", "date": "언급된 일정" }],
  "terms": [{ "term": "전문용어", "description": "쉬운 설명" }],
  "questions": ["추가로 확인해야 할 내용"]
}`

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || !apiKey.trim()) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.')
  }

  return new OpenAI({ apiKey })
}

const buildOpenAIErrorResponse = (error, fallbackError) => {
  const message = error instanceof Error ? error.message : fallbackError

  if (
    message.includes('OPENAI_API_KEY') ||
    message.includes('api key') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return { status: 500, payload: { error: 'OpenAI API 키가 누락되었거나 유효하지 않습니다.' } }
  }

  return { status: 500, payload: { error: fallbackError } }
}

const createStructuredResponse = async ({ schema, systemPrompt, userText, outputName }) => {
  const client = getOpenAIClient()

  const response = await client.responses.parse({
    model: DEFAULT_MODEL,
    input: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userText,
      },
    ],
    text: {
      format: zodTextFormat(schema, outputName),
    },
  })

  if (!response.output_parsed) {
    throw new Error('OpenAI 응답을 파싱할 수 없습니다.')
  }

  return schema.parse(response.output_parsed)
}

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Translate (mock) endpoint - forwards request to server-side mockAnalysis
import { buildMockAnalysis } from './mockAnalysis.js'
import { buildMockMeetingSummary } from './mockMeeting.js'
import { buildMockProposalAnalysis } from './mockProposal.js'

app.post('/api/translate', (req, res) => {
  try {
    const { text, category, level } = req.body ?? {}

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '텍스트를 입력해주세요.' })
    }

    const selectedCategory = category || 'auto'
    const selectedLevel = (level || 'basic').toLowerCase()

    const result = buildMockAnalysis(text, selectedCategory, selectedLevel)
    return res.json(result)
  } catch (err) {
    console.error('Error in /api/translate:', err)
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
  }
})

// Meeting endpoint - server-side mock
app.post('/api/meeting', (req, res) => {
  try {
    const { text } = req.body ?? {}

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '회의 내용을 입력해주세요.' })
    }

    const result = buildMockMeetingSummary(text)
    return res.json(result)
  } catch (err) {
    console.error('Error in /api/meeting:', err)
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
  }
})

// Proposal endpoint - server-side mock
app.post('/api/proposal', (req, res) => {
  try {
    const { text } = req.body ?? {}

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '분석할 기획안을 입력해주세요.' })
    }

    const result = buildMockProposalAnalysis(text)
    return res.json(result)
  } catch (err) {
    console.error('Error in /api/proposal:', err)
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' })
  }
})

// Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, category, level } = req.body ?? {}

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '텍스트를 입력해주세요.' })
    }

    const selectedCategory = normalizeCategory(category)
    const selectedLevel = normalizeLevel(level)

    const parsed = await createStructuredResponse({
      schema: AnalysisOutputSchema,
      systemPrompt: buildSystemPrompt(selectedCategory, selectedLevel),
      userText: `분석할 문장:\n${text.trim()}`,
      outputName: 'analysis_result',
    })

    return res.json({
      category: parsed.category,
      terms: parsed.terms ?? [],
      easySentence: parsed.easySentence,
      actions: parsed.actions ?? [],
    })
  } catch (error) {
    console.error('Error in /api/analyze:', error)
    const result = buildOpenAIErrorResponse(error, '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    return res.status(result.status).json(result.payload)
  }
})

app.post('/api/meeting-summary', async (req, res) => {
  try {
    const { text } = req.body ?? {}

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '회의 내용을 입력해주세요.' })
    }

    const parsed = await createStructuredResponse({
      schema: MeetingSummarySchema,
      systemPrompt: buildMeetingSummaryPrompt(),
      userText: `회의 내용:\n${text.trim()}`,
      outputName: 'meeting_summary_result',
    })

    return res.json({
      summary: parsed.summary,
      decisions: parsed.decisions ?? [],
      tasks: parsed.tasks ?? [],
      schedules: parsed.schedules ?? [],
      terms: parsed.terms ?? [],
      questions: parsed.questions ?? [],
    })
  } catch (error) {
    console.error('Error in /api/meeting-summary:', error)
    const result = buildOpenAIErrorResponse(error, '회의 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    return res.status(result.status).json(result.payload)
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

app.listen(PORT, () => {
  console.log(`SpecBridge server running on http://localhost:${PORT}`)
})
