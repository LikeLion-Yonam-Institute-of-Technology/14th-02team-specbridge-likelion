import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { z } from 'zod'
import { zodTextFormat } from 'openai/helpers/zod'
import * as cheerio from 'cheerio'

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

// Proposal schema
const ProposalSchema = z.object({
  summary: z.string().min(1),
  problem: z.string().min(1),
  users: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  flow: z.array(z.string()).default([]),
  tech: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
})

const PageJargonSchema = z.object({
  terms: z.array(
    z.object({
      term: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ).default([]),
})

const FALLBACK_PAGE_TERMS = [
  { term: 'API', explanation: '서로 다른 프로그램이 데이터를 주고받도록 정해 둔 통신 규칙입니다.' },
  { term: 'AI', explanation: '사람의 학습과 판단을 컴퓨터가 일부 수행하도록 만든 기술입니다.' },
  { term: 'LLM', explanation: '대량의 텍스트를 학습해 문장을 이해하고 생성하는 대규모 언어 모델입니다.' },
  { term: 'UI', explanation: '사용자가 서비스와 직접 보고 조작하는 화면과 구성 요소입니다.' },
  { term: 'UX', explanation: '사용자가 서비스를 이용하며 느끼는 전체 경험입니다.' },
  { term: 'HTTP', explanation: '웹 브라우저와 서버가 데이터를 주고받을 때 사용하는 통신 규약입니다.' },
  { term: '클라우드', explanation: '인터넷을 통해 서버와 저장 공간 같은 컴퓨팅 자원을 사용하는 방식입니다.' },
]

const extractFallbackPageTerms = (text) => FALLBACK_PAGE_TERMS.filter(({ term }) => {
  const boundary = '(?<![\\p{L}\\p{N}])'
  return new RegExp(`${boundary}${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(text)
})

const extractPageTerms = async (text) => {
  if (!process.env.OPENAI_API_KEY?.trim()) return extractFallbackPageTerms(text)

  try {
    const parsed = await createStructuredResponse({
      schema: PageJargonSchema,
      systemPrompt: `당신은 웹페이지 전문용어 분석 전문가입니다.
- 본문에 실제로 등장한 전문용어만 최대 20개 추출하세요.
- 각 용어를 비전공자가 이해할 수 있는 한국어 한두 문장으로 설명하세요.
- 전문용어가 없으면 terms를 빈 배열로 반환하세요.`,
      userText: `웹페이지 본문:\n${text.slice(0, 12000)}`,
      outputName: 'page_jargon_result',
    })
    return parsed.terms ?? []
  } catch (error) {
    console.error('Page jargon extraction fallback:', error)
    return extractFallbackPageTerms(text)
  }
}

const escapeHtmlAttribute = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const highlightPageTerms = (html, terms) => {
  const $ = cheerio.load(html, { decodeEntities: false })
  $('script, style, noscript, template').remove()
  const termPattern = terms
    .slice()
    .sort((a, b) => b.term.length - a.term.length)
    .map(({ term, explanation }) => ({
      term,
      explanation,
      pattern: new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'giu'),
    }))

  $('body *').contents().filter((_, node) => node.type === 'text').each((_, node) => {
    let content = node.data
    for (const { term, explanation, pattern } of termPattern) {
      content = content.replace(pattern, (matched) => `<span class="highlight-jargon" data-explanation="${escapeHtmlAttribute(explanation)}">${escapeHtmlAttribute(matched)}</span>`)
    }
    if (content !== node.data) $(node).replaceWith(content)
  })

  return $('body').html() ?? $.html()
}

const buildProposalPrompt = () => `당신은 한국어로 기획서를 검토하고 요약하는 전문가입니다.
- 반드시 JSON 형식으로만 응답하세요.
- 사용자가 입력한 기획안 내용에서 명확히 드러난 정보만 사용하세요. 임의로 사실을 만들지 마세요.
- 다음 항목을 작성하세요:
  - summary: 프로젝트를 한 줄로 간결하게 설명
  - problem: 해결하려는 문제를 구체적으로 기술
  - users: 주요 사용자(대상)를 나열
  - features: 핵심 기능들을 항목화
  - flow: 서비스 사용 흐름(단계별)
  - tech: 필요 기술 스택(예: React, Node.js 등)
  - questions: 추가로 확인이 필요한 사항
  - gaps: 기획서에서 부족하거나 빠져 있는 요구사항을 구체적으로 지적(예: 인증/권한, 데이터 소스 명시부족, 성능 요구 불명확 등)
- gaps는 단순 문구보다 어떻게 개선할지에 대한 구체적 권장사항을 포함하세요.
- 최종 결과는 아래 구조를 정확히 따라야 합니다:
{
  "summary": "프로젝트 한 줄 설명",
  "problem": "해결하려는 문제",
  "users": ["주요 사용자"],
  "features": ["핵심 기능"],
  "flow": ["단계별 흐름"],
  "tech": ["필요 기술"],
  "questions": ["추가로 확인할 사항"],
  "gaps": ["구체적 부족/불확실 항목 및 권장 개선안"]
}`

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
- terms는 문맥에서 전문용어로 사용된 항목만 포함하세요. 예를 들어 개발 관련("API", "UI", "UX", "프론트엔드", "백엔드", "서버", "데이터베이스", "배포", "Git", "CI/CD", "Docker", "Framework" 등), 기획·디자인 관련 용어도 문맥에 따라 전문용어로 판단할 수 있습니다.
  - 위 예시는 참고용이며, 반드시 문맥을 고려해 전문용어로 쓰인 경우에만 terms에 포함하세요.
  - 각 terms 항목은 {"term": "전문용어", "description": "비전공자도 이해할 수 있게 짧고 쉬운 설명"} 형태로 작성하세요.
  - 전문용어가 문맥상 없으면 terms는 빈 배열로 반환하세요.
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

app.post('/api/translate', async (req, res) => {
  try {
    const { text, category, level } = req.body ?? {}

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '텍스트를 입력해주세요.' })
    }

    const selectedCategory = normalizeCategory(category)
    const selectedLevel = normalizeLevel(level)

    // Use OpenAI Responses API to build a structured analysis
    const parsed = await createStructuredResponse({
      schema: AnalysisOutputSchema,
      systemPrompt: buildSystemPrompt(selectedCategory, selectedLevel),
      userText: `분석할 문장:\n${text.trim()}`,
      outputName: 'analysis_result',
    })

    // Map results to include both description (legacy) and simple (requested)
    const terms = (parsed.terms || []).map((t) => ({
      term: t.term,
      description: t.description,
      simple: t.description,
    }))

    return res.json({
      category: parsed.category,
      terms,
      easySentence: parsed.easySentence,
      actions: parsed.actions || [],
    })
  } catch (error) {
    console.error('Error in /api/translate:', error)
    const result = buildOpenAIErrorResponse(error, '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    // Do not leak internal details to users; use generic message for client
    const clientMessage = { error: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
    return res.status(result.status).json(result.payload && result.payload.error ? clientMessage : { error: '서버 오류' })
  }
})

// Meeting endpoint - use OpenAI Responses API to produce structured meeting summary
app.post('/api/meeting', async (req, res) => {
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
    console.error('Error in /api/meeting:', error)
    const result = buildOpenAIErrorResponse(error, '회의 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    const clientMessage = { error: '회의 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
    return res.status(result.status).json(result.payload && result.payload.error ? clientMessage : { error: '서버 오류' })
  }
})

// Proposal endpoint - use OpenAI Responses API to produce structured proposal analysis
app.post('/api/proposal', async (req, res) => {
  try {
    const { text } = req.body ?? {}

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '분석할 기획안을 입력해주세요.' })
    }

    const parsed = await createStructuredResponse({
      schema: ProposalSchema,
      systemPrompt: buildProposalPrompt(),
      userText: `기획안 내용:\n${text.trim()}`,
      outputName: 'proposal_result',
    })

    return res.json({
      summary: parsed.summary,
      problem: parsed.problem,
      users: parsed.users ?? [],
      features: parsed.features ?? [],
      flow: parsed.flow ?? [],
      tech: parsed.tech ?? [],
      questions: parsed.questions ?? [],
      gaps: parsed.gaps ?? [],
    })
  } catch (error) {
    console.error('Error in /api/proposal:', error)
    const result = buildOpenAIErrorResponse(error, '기획안 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    const clientMessage = { error: '기획안 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
    return res.status(result.status).json(result.payload && result.payload.error ? clientMessage : { error: '서버 오류' })
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

app.post('/api/analyze-url', async (req, res) => {
  try {
    const { url } = req.body ?? {}
    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: '웹페이지 URL을 입력해주세요.' })
    }

    let targetUrl
    try {
      targetUrl = new URL(url.trim())
    } catch {
      return res.status(400).json({ error: '올바른 URL을 입력해주세요.' })
    }

    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'http 또는 https URL만 분석할 수 있습니다.' })
    }

    const pageResponse = await fetch(targetUrl, {
      headers: { 'User-Agent': 'SpecBridge/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!pageResponse.ok) {
      return res.status(502).json({ error: `웹페이지를 가져오지 못했습니다. (${pageResponse.status})` })
    }

    const html = await pageResponse.text()
    const $ = cheerio.load(html)
    $('script, style, noscript, template').remove()
    const pageText = $('body').text().replace(/\s+/g, ' ').trim()
    const terms = await extractPageTerms(pageText)

    return res.json({
      sourceUrl: targetUrl.toString(),
      html: highlightPageTerms(html, terms),
      terms,
    })
  } catch (error) {
    console.error('Error in /api/analyze-url:', error)
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return res.status(504).json({ error: '웹페이지 응답 시간이 초과되었습니다.' })
    }
    return res.status(502).json({ error: '웹페이지 분석 중 서버 오류가 발생했습니다.' })
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
