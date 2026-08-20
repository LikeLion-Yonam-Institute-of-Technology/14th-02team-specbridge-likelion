import React, { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default function PageTranslateForm({ onResult }) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!url.trim()) {
      setError('분석할 웹페이지 URL을 입력해주세요.')
      return
    }

    setError('')
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/analyze-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || '웹페이지 분석에 실패했습니다.')
      onResult(body)
    } catch (requestError) {
      setError(requestError.message || '웹페이지 분석 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="url-form" onSubmit={handleSubmit}>
      <div className="control">
        <label className="label" htmlFor="page-url">분석할 웹페이지 URL</label>
        <input id="page-url" className="url-input" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" disabled={isLoading} required />
        {error && <div className="error-message">{error}</div>}
      </div>
      <div className="control action">
        <button className="btn-primary" type="submit" disabled={isLoading}>
          {isLoading && <span className="loading-spinner" aria-hidden="true" />}
          {isLoading ? '분석 중...' : '분석'}
        </button>
      </div>
    </form>
  )
}