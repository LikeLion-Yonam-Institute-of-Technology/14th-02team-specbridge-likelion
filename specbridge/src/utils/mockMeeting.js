// Mock meeting summary helper

export const MOCK_MEETING_RESULT = {
  summary: '핵심만 정리하면, 외부 데이터 연동과 화면 개선이 필요합니다.',
  decisions: ['외부 데이터 연동 진행', 'UX 개선 우선 순위 지정'],
  tasks: [
    { person: '김철수', task: 'API 연동 검토 및 구현 계획 수립' },
    { person: '이영희', task: '서버 데이터 처리 로직 설계' },
    { person: '박민호', task: '프론트 화면에 결과 렌더링' },
  ],
  schedules: [
    { item: 'API 연동 완료', date: '2026-08-25' },
    { item: 'UX 개선 프로토타입 리뷰', date: '2026-08-30' },
  ],
  terms: [
    { term: 'API', description: '외부 시스템과 통신하기 위한 인터페이스' },
    { term: '렌더링', description: '데이터를 화면에 표시하는 과정' },
  ],
  questions: ['구체적인 담당자 리소스 확보 여부', '우선순위에 따른 일정 조정 필요 여부'],
}

export function buildMockMeetingSummary(text) {
  const normalized = (text || '').trim()
  // Simple heuristic: if certain keywords present, return the mock with some adjustments
  const lower = normalized.toLowerCase()

  // If text short, return a minimal summary
  if (!normalized) {
    return null
  }

  const result = { ...MOCK_MEETING_RESULT }

  // If the meeting mentions a different date, try to capture as schedule (very naive)
  const dateMatch = normalized.match(/(20\d{2}-\d{2}-\d{2})/)
  if (dateMatch) {
    result.schedules = [{ item: '언급된 일정', date: dateMatch[1] }]
  }

  // If '보류' or '연기' appears, adjust decisions
  if (lower.includes('보류') || lower.includes('연기')) {
    result.decisions = ['해당 이슈 보류']
    result.questions.push('보류 사유와 재논의 일정')
  }

  return result
}
