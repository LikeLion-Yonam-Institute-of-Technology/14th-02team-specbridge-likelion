// Server-side mock proposal analysis helper (copied from frontend mock)

export const MOCK_PROPOSAL_RESULT = {
  summary: '전문용어 번역과 회의 요약을 통해 협업 이해도를 높이는 서비스',
  problem: '전공자가 아닌 팀원이 전문용어로 인해 요구사항을 이해하지 못해 협업 효율이 떨어짐',
  users: ['비전공자', '초보 개발자', '대학생', '프로젝트 팀원'],
  features: [
    '전문어 탐지 및 쉬운 설명',
    '문장 단위 쉬운 번역',
    '회의 요약 및 결정사항 정리',
  ],
  flow: ['사용자가 내용을 입력', '분석 시작', '전문 내용 분석', '쉬운 설명 및 요약 제공'],
  tech: ['React', 'Node.js', 'AI API'],
  questions: ['입력 길이 제한 정의 필요', '오류/실패 시 사용자 안내 정의 필요'],
  gaps: ['상세한 권한 관리, 인증 방식이 정의되어 있지 않음'],
}

export function buildMockProposalAnalysis(text) {
  const normalized = (text || '').trim()
  if (!normalized) return null

  const lower = normalized.toLowerCase()

  // heuristics to extract simple data
  const summaryMatch = normalized.split(/[.\n]/).find((s) => s.length > 20) || ''

  const problemKeywords = ['문제', '이슈', '갈등', '불편']
  const problem = problemKeywords.some((k) => lower.includes(k))
    ? normalized
    : MOCK_PROPOSAL_RESULT.problem

  const users = []
  if (lower.includes('학생') || lower.includes('대학생')) users.push('대학생')
  if (lower.includes('초보') || lower.includes('초급')) users.push('초보 개발자')
  if (lower.includes('비전공') || lower.includes('비전공자')) users.push('비전공자')
  if (users.length === 0) users.push(...MOCK_PROPOSAL_RESULT.users)

  const features = []
  if (lower.includes('전문어') || lower.includes('용어')) features.push('전문어 탐지 및 쉬운 설명')
  if (lower.includes('회의') || lower.includes('요약')) features.push('회의 요약 및 결정사항 정리')
  if (lower.includes('기획') || lower.includes('기획안')) features.push('문서 기반 기획안 요약')
  if (features.length === 0) features.push(...MOCK_PROPOSAL_RESULT.features)

  const flow = MOCK_PROPOSAL_RESULT.flow
  const tech = []
  if (lower.includes('react')) tech.push('React')
  if (lower.includes('node') || lower.includes('express')) tech.push('Node.js')
  if (tech.length === 0) tech.push(...MOCK_PROPOSAL_RESULT.tech)

  // detect gaps (missing or ambiguous requirements)
  const gaps = []
  if (!lower.includes('api') && !lower.includes('데이터') && !lower.includes('서버')) {
    gaps.push('데이터 소스 및 API 연동 방법이 명확하지 않습니다.')
  }
  if (!lower.includes('사용자') && !lower.includes('유저') && !lower.includes('타겟')) {
    gaps.push('타겟 사용자(주요 사용자)가 명시적으로 정의되어 있지 않습니다.')
  }
  if (!lower.includes('성능') && !lower.includes('제한') && !lower.includes('속도')) {
    gaps.push('성능/처리량 요구사항이 없습니다.')
  }
  if (gaps.length === 0) gaps.push(...MOCK_PROPOSAL_RESULT.gaps)

  const questions = [...MOCK_PROPOSAL_RESULT.questions]

  return {
    summary: summaryMatch || MOCK_PROPOSAL_RESULT.summary,
    problem,
    users,
    features,
    flow,
    tech,
    questions,
    gaps,
  }
}
