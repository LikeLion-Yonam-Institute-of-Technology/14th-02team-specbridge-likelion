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

function TermCard({ term, description }) {
  return (
    <div className="term-card">
      <div className="term">{term}</div>
      <div className="term-desc">{description}</div>
    </div>
  )
}

export default function MeetingPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setError('')

    if (!text.trim()) {
      setError('회의 내용을 입력해주세요.')
      return
    }

    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      // call backend meeting API
      await new Promise((resolve) => setTimeout(resolve, 200))

      const res = await fetch(`${API_BASE}/api/meeting`, {
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
    } catch (err) {
      console.error('회의 분석 오류:', err)
      setError(err.message || '회의 요약 중 오류가 발생했습니다.')
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
        <h1>회의 요약</h1>
        <p className="lead">긴 회의 내용을 AI가 핵심 내용과 업무 중심으로 정리해드립니다.</p>
      </section>

      <section className="translate-page">
        {!result ? (
          <>
            <div className="input-card">
              <label className="label">회의 내용</label>
              <textarea
                className="textarea large"
                rows={8}
                placeholder="회의 내용이나 회의록을 입력해주세요."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isLoading}
              />
              <div className="input-footer">
                <div className="char-count">{text.length} 자</div>
                {error && <div className="error-message">{error}</div>}
                <div className="analyze-area">
                  <div className="loading-note">{isLoading ? '회의 내용을 분석하고 있습니다...' : ''}</div>
                  <button className="btn-primary" onClick={handleAnalyze} disabled={isLoading}>{isLoading ? '✨ 분석 중...' : '✨ AI로 분석하기'}</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="result-header">
              <button className="btn-retry" onClick={handleRetry}>다시 분석하기</button>
            </div>

            <div className="result-grid">
              <ResultCard title="회의 한 줄 요약">
                <p className="easy">{result.summary}</p>
              </ResultCard>

              <ResultCard title="주요 결정 사항">
                {result.decisions?.length ? (
                  <ul className="action-list">
                    {result.decisions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="easy">결정 사항이 확인되지 않았습니다.</p>
                )}
              </ResultCard>

              <ResultCard title="담당 업무">
                {result.tasks?.length ? (
                  <ul className="action-list">
                    {result.tasks.map((task, index) => (
                      <li key={`${task.person}-${task.task}-${index}`}>
                        <strong>{task.person || '담당자 미기재'}</strong>: {task.task}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="easy">담당 업무가 확인되지 않았습니다.</p>
                )}
              </ResultCard>

              <ResultCard title="일정">
                {result.schedules?.length ? (
                  <ul className="action-list">
                    {result.schedules.map((schedule, index) => (
                      <li key={`${schedule.item}-${schedule.date}-${index}`}>
                        <strong>{schedule.date || '일정 미기재'}</strong> - {schedule.item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="easy">언급된 일정이 없습니다.</p>
                )}
              </ResultCard>

              <div style={{ gridColumn: '1 / -1' }}>
                <h3 className="result-section-title">발견된 전문용어</h3>
                <div className="terms">
                  {result.terms?.length ? (
                    result.terms.map((term, index) => (
                      <TermCard key={`${term.term}-${index}`} term={term.term} description={term.description} />
                    ))
                  ) : (
                    <div className="result-card" style={{ width: '100%' }}>
                      <p className="easy">전문용어가 발견되지 않았습니다.</p>
                    </div>
                  )}
                </div>
              </div>

              <ResultCard title="추가 확인 필요">
                {result.questions?.length ? (
                  <ul className="action-list">
                    {result.questions.map((q, index) => (
                      <li key={`${q}-${index}`}>{q}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="easy">추가 확인이 필요하지 않습니다.</p>
                )}
              </ResultCard>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
