import React from 'react'
import Logo from './Logo'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: '새 분석' },
  { to: '/translate', label: '전문어 번역' },
  { to: '/meeting', label: '회의 요약' },
  { to: '/proposal', label: '기획안 요약' },
  { to: '/settings', label: '설정' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-brand">
          <Logo />
        </div>

        <nav className="sidebar-nav">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                isActive ? 'nav-item nav-item-active' : 'nav-item'
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">v0.1</div>
      </div>
    </aside>
  )
}
