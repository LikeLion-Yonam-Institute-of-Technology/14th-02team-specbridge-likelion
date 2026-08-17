import React from 'react'
import Button from './Button'
import FeatureCard from './FeatureCard'
import { Link } from 'react-router-dom'

export default function Main() {
  return (
    <main className="main">
      <section className="hero">
        <h1>어려운 말을 이해하기 쉽게</h1>
        <p className="lead">전문 용어를 쉽게 풀어주는 AI 기반 전공어 번역 서비스</p>
        <div className="hero-cta">
          <Link to="/translate">
            <Button>전문어 번역 시작</Button>
          </Link>
        </div>
      </section>

      <section className="cards">
        <FeatureCard title="전문어 번역">용어를 쉽게 풀이하고 예시를 제공합니다.</FeatureCard>
        <FeatureCard title="회의 요약">긴 회의 내용을 핵심만 간결하게 요약합니다.</FeatureCard>
        <FeatureCard title="기획안 요약">기획 문서를 빠르게 요약하고 항목별로 정리합니다.</FeatureCard>
      </section>
    </main>
  )
}
