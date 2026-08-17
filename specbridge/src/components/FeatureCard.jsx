import React from 'react'

export default function FeatureCard({ title, children }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">📌</div>
      <div className="feature-content">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  )
}
