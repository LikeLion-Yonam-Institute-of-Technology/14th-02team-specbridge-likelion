import React, { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'


function ResultCard({ title, children }) {
  return (
    <div className="result-card">
      <h4 className="result-card-title">{title}</h4>
      {children}
    </div>
  )
}

export default function ProposalPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setError('')

    if (!text.trim()) {
      setError('분석할 기획안을 입력해주세요.')
      return
    }

    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      const res = await fetch(`${API_BASE}/api/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const message = (body && body.error) || '서버 응답 오류'
        throw new Error(message)
      }

      const json = await res.json()
      setResult(json)
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
        <h1>기획안 요약</h1>
        <p className="lead">긴 기획안을 핵심 내용과 확인이 필요한 부분 중심으로 정리해드립니다.</p>
      </section>

      <section className="translate-page">
        {!result ? (
          <>
            <div className="input-area">
              <textarea
                className="textarea"
                rows={8}
                placeholder="분석할 기획안이나 프로젝트 내용을 입력해주세요."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isLoading}
              />
              {error && <div className="error-message">{error}</div>}
            </div>

            <div className="controls">
              <div className="control action" style={{ width: '100%' }}>
                <button className="btn-primary" onClick={handleAnalyze} disabled={isLoading}>
                  {isLoading ? '분석 중...' : '기획안 분석하기'}
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
              <ResultCard title="프로젝트 한 줄 설명">
                <p className="easy">{result.summary}</p>
              </ResultCard>

              <ResultCard title="해결하려는 문제">
                <p className="easy">{result.problem}</p>
              </ResultCard>

              <ResultCard title="주요 사용자">
                <ul className="action-list">
                  {result.users.map((user) => (
                    <li key={user}>{user}</li>
                  ))}
                </ul>
              </ResultCard>

              <ResultCard title="핵심 기능">
                <ul className="action-list">
                  {result.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </ResultCard>

              <ResultCard title="서비스 사용 흐름">
                <ol className="action-list">
                  {result.flow.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </ResultCard>

              <ResultCard title="필요한 기술">
                <ul className="action-list">
                  {result.tech.map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
              </ResultCard>

              <ResultCard title="확인이 필요한 부분">
                <ul className="action-list">
                  {result.questions.map((question) => (
                    <li key={question}>{question}</li>
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
