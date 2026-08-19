import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

const STORAGE_KEY = 'specbridge-settings'

const DEFAULT_SETTINGS = {
  level: '기본',
  defaultCategory: 'AI 자동 감지',
  showTermDescription: true,
  showEasySentence: true,
  showActions: true,
}

const normalizeCategoryForSelect = (value) => {
  if (value === '개발·IT' || value === '개발 · IT') return '개발 · IT'
  if (value === '기획·PM' || value === '기획 · PM') return '기획 · PM'
  if (value === '디자인·UI·UX' || value === '디자인 · UI/UX') return '디자인 · UI/UX'
  return 'AI 자동 감지'
}

const normalizeLevelForSelect = (value) => {
  if (value === '간단' || value === '간단하게') return '간단하게'
  if (value === '자세히' || value === '자세하게') return '자세하게'
  return '기본'
}

const getStoredSettings = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(saved)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      level: normalizeLevelForSelect(parsed.level ?? DEFAULT_SETTINGS.level),
      defaultCategory: normalizeCategoryForSelect(parsed.defaultCategory ?? DEFAULT_SETTINGS.defaultCategory),
      showTermDescription: parsed.showTermDescription !== false,
      showEasySentence: parsed.showEasySentence !== false,
      showActions: parsed.showActions !== false,
    }
  } catch (error) {
    console.error('설정 불러오기 실패:', error)
    return DEFAULT_SETTINGS
  }
}



function TermCard({ term, description }) {
  return (
    <div className="term-card">
      <div className="term">{term}</div>
      <div className="term-desc">{description}</div>
    </div>
  )
}

function ResultCard({ title, children }) {
  return (
    <div className="result-card">
      <h4 className="result-card-title">{title}</h4>
      {children}
    </div>
  )
}

export default function TranslatePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [text, setText] = useState('')
  const [settings, setSettings] = useState(() => getStoredSettings())
  const [category, setCategory] = useState(() => normalizeCategoryForSelect(getStoredSettings().defaultCategory))
  const [level, setLevel] = useState(() => normalizeLevelForSelect(getStoredSettings().level))
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const syncSettings = () => {
      const nextSettings = getStoredSettings()
      setSettings(nextSettings)
      setCategory(normalizeCategoryForSelect(nextSettings.defaultCategory))
      setLevel(normalizeLevelForSelect(nextSettings.level))
    }

    window.addEventListener('storage', syncSettings)
    return () => {
      window.removeEventListener('storage', syncSettings)
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      const nextSettings = getStoredSettings()
      setSettings(nextSettings)
      setText('')
      setCategory(normalizeCategoryForSelect(nextSettings.defaultCategory))
      setLevel(normalizeLevelForSelect(nextSettings.level))
      setResult(null)
      setError('')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleAnalyze = async () => {
    setError('')

    if (!text.trim()) {
      setError('분석할 내용을 입력해주세요.')
      return
    }

    setIsLoading(true)

    try {
      // call backend translate API
      await new Promise((resolve) => setTimeout(resolve, 200))

      const payload = {
        text: text.trim(),
        category: category === 'AI 자동 감지' ? 'auto' : category,
        level: (function mapLevel(l) {
          if (l === '간단하게') return 'simple'
          if (l === '자세하게') return 'detail'
          return 'basic'
        })(level),
      }

      const res = await fetch(`${API_BASE}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const message = (body && body.error) || '서버 응답 오류'
        throw new Error(message)
      }

      const json = await res.json()
      setResult(json)
    } catch (err) {
      console.error('분석 요청 오류:', err)
      setError('분석 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setText('')
    setResult(null)
    setError('')
  }

  const { showTermDescription, showEasySentence, showActions } = settings

  return (
    <div className="main">
      <section className="hero">
        <h1>전문어 번역</h1>
        <p className="lead">어려운 전문용어와 문장을 이해하기 쉽게 바꿔드립니다.</p>
      </section>

      <section className="translate-page">
        {!result ? (
          <>
            <div className="input-area">
              <label className="label">분석할 텍스트</label>
              <textarea
                className="textarea"
                rows={6}
                placeholder={`분석할 문장이나 대화 내용을 입력해주세요.

예시:
API를 받아 서버에서 처리하고 프론트에서 렌더링하면 됩니다.
UI는 괜찮지만 UX 개선이 필요합니다.`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {error && <div className="error-message">{error}</div>}
            </div>

            <div className="controls">
              <div className="control">
                <label className="label">분야</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={isLoading}>
                  <option>AI 자동 감지</option>
                  <option>개발 · IT</option>
                  <option>기획 · PM</option>
                  <option>디자인 · UI/UX</option>
                </select>
              </div>

              <div className="control">
                <label className="label">설명 수준</label>
                <div className="radio-group">
                  <label>
                    <input type="radio" name="level" value="간단하게" checked={level === '간단하게'} onChange={() => setLevel('간단하게')} disabled={isLoading} /> 간단하게
                  </label>
                  <label>
                    <input type="radio" name="level" value="기본" checked={level === '기본'} onChange={() => setLevel('기본')} disabled={isLoading} /> 기본
                  </label>
                  <label>
                    <input type="radio" name="level" value="자세하게" checked={level === '자세하게'} onChange={() => setLevel('자세하게')} disabled={isLoading} /> 자세하게
                  </label>
                </div>
              </div>

              <div className="control action">
                <button className="btn-primary" onClick={handleAnalyze} disabled={isLoading}>
                  {isLoading ? '분석 중...' : '분석하기'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="result-header">
              <button className="btn-retry" onClick={handleRetry}>다시 분석하기</button>
            </div>

            <div className="result-grid">
              <ResultCard title="감지 분야">
                <div className="badge">{result.category}</div>
              </ResultCard>

              {showTermDescription && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3 className="result-section-title">전문용어</h3>
                  <div className="terms">
                    {result.terms.map((t) => (
                      <TermCard key={t.term} term={t.term} description={t.description} />
                    ))}
                  </div>
                </div>
              )}

              {showEasySentence && (
                <ResultCard title="쉬운 설명">
                  <p className="easy">{result.easySentence}</p>
                </ResultCard>
              )}

              {showActions && (
                <ResultCard title="해야 할 일">
                  <ul className="action-list">
                    {result.actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </ResultCard>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
