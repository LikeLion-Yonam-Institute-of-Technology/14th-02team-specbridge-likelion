import React, { useState } from 'react'

export default function PageViewer({ html, sourceUrl }) {
  const [tooltip, setTooltip] = useState(null)

  const handleMouseOver = (event) => {
    const jargon = event.target.closest('.highlight-jargon')
    if (!jargon) return
    setTooltip({ explanation: jargon.dataset.explanation, x: event.clientX, y: event.clientY })
  }

  const handleMouseMove = (event) => {
    if (tooltip) setTooltip((current) => ({ ...current, x: event.clientX, y: event.clientY }))
  }

  return (
    <div className="page-viewer" onMouseOver={handleMouseOver} onMouseMove={handleMouseMove} onMouseOut={(event) => { if (!event.relatedTarget?.closest?.('.highlight-jargon')) setTooltip(null) }}>
      <p className="page-source">분석한 페이지: {sourceUrl}</p>
      <div className="page-viewer-content" dangerouslySetInnerHTML={{ __html: html }} />
      {tooltip && <div className="jargon-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.explanation}</div>}
    </div>
  )
}