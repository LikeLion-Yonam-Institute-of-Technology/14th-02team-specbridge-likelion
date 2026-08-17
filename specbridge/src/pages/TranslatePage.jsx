import React, { useState } from 'react'

const API_BASE_URL = 'http://localhost:3001'

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
  const [text, setText] = useState('')
  const [category, setCategory] = useState('AI 자동 감지')
  const [level, setLevel] = useState('기본')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setError('')
    
    // 입력 검증
    if (!text.trim()) {
      setError('분석할 내용을 입력해주세요.')
      return
    }

    // 로딩 상태 시작
    setIsLoading(true)
    
    try {
      // 백엔드 API 호출
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          category: category === 'AI 자동 감지' ? 'auto' : category,
          level: level,
        }),
      })

      if (!response.ok) {
        throw new Error('API 응답 실패')
      }

      const data = await response.json()
      setResult(data)
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

              <div style={{ gridColumn: '1 / -1' }}>
                <h3 className="result-section-title">전문용어</h3>
                <div className="terms">
                  {result.terms.map((t) => (
                    <TermCard key={t.term} term={t.term} description={t.description} />
                  ))}
                </div>
              </div>

              <ResultCard title="쉬운 설명">
                <p className="easy">{result.easySentence}</p>
              </ResultCard>

              <ResultCard title="해야 할 일">
                <ul className="action-list">
                  {result.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </ResultCard>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
