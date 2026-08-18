// Mock analysis helper for TranslatePage

export const MOCK_ANALYSIS_RESULT = {
  category: '개발 · IT',
  terms: [
    {
      term: 'API',
      description: '프로그램이나 서비스가 서로 데이터를 주고받을 수 있도록 만든 연결 방법',
    },
    {
      term: '서버',
      description: '데이터를 저장하거나 처리해서 사용자에게 제공하는 시스템',
    },
    {
      term: '프론트엔드',
      description: '사용자가 직접 보고 조작하는 웹사이트나 앱의 화면 부분',
    },
    {
      term: '렌더링',
      description: '데이터나 코드를 실제 화면에 표시하는 과정',
    },
    {
      term: 'UI',
      description: '사용자가 직접 보는 화면과 버튼 등의 인터페이스',
    },
    {
      term: 'UX',
      description: '사용자가 서비스를 이용하면서 느끼는 전체적인 경험',
    },
  ],
  easySentence:
    '외부에서 데이터를 가져온 뒤 서버에서 처리하고 사용자가 보는 화면에 표시하면 됩니다. 현재 화면 구성은 괜찮지만 사용자가 더 편하게 이용할 수 있도록 개선이 필요하다는 의미입니다.',
  actions: ['외부 데이터 연결', '서버에서 데이터 처리', '프론트 화면에 결과 표시', '사용자 경험 개선'],
}

// buildMockAnalysis: returns a mock result based on input text, category, level
export function buildMockAnalysis(text, selectedCategory, selectedLevel) {
  const normalized = (text || '').trim()
  const lower = normalized.toLowerCase()

  // If the input contains keywords, prefer a detected-term-based result
  const keywordMap = [
    { key: 'api', term: 'API' },
    { key: '서버', term: '서버' },
    { key: '프론트', term: '프론트엔드' },
    { key: 'frontend', term: '프론트엔드' },
    { key: 'render', term: '렌더링' },
    { key: 'ui', term: 'UI' },
    { key: 'ux', term: 'UX' },
  ]

  const detected = keywordMap.filter((k) => lower.includes(k.key)).map((k) => k.term)

  const terms = MOCK_ANALYSIS_RESULT.terms.filter((t) => detected.length === 0 || detected.includes(t.term))
  const category = selectedCategory || MOCK_ANALYSIS_RESULT.category

  // level influences easySentence tone; keep variants short
  const levelVariants = {
    '간단하게': '핵심만 요약하면, 데이터를 받아 처리해 화면에 보여주고 UX를 개선해야 합니다.',
    '기본': MOCK_ANALYSIS_RESULT.easySentence,
    '자세하게':
      '외부 데이터 수집 → 서버 처리 → 프론트 렌더링의 흐름입니다. 화면 자체는 괜찮지만, 실제 사용자가 느끼는 경험을 개선하는 작업(UX)이 필요합니다.',
  }

  const easySentence = levelVariants[selectedLevel] || levelVariants['기본']

  return {
    category,
    terms: terms.length ? terms : MOCK_ANALYSIS_RESULT.terms,
    easySentence,
    actions: MOCK_ANALYSIS_RESULT.actions,
  }
}
