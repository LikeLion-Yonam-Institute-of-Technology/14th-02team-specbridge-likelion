import React, { useState } from 'react'
import PageTranslateForm from '../components/PageTranslateForm'
import PageViewer from '../components/PageViewer'

export default function PageTranslatePage() {
  const [result, setResult] = useState(null)

  return (
    <main className="main">
      <section className="hero">
        <h1>페이지 번역</h1>
        <p className="lead">웹페이지의 전문용어를 찾아 이해하기 쉬운 설명을 보여줍니다.</p>
      </section>
      <section className="page-translate-page">
        {!result && <PageTranslateForm onResult={setResult} />}
        {result && <>
          <button className="btn-retry" type="button" onClick={() => setResult(null)}>다시 분석하기</button>
          <PageViewer html={result.html} sourceUrl={result.sourceUrl} />
        </>}
      </section>
    </main>
  )
}