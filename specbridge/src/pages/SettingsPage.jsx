import React, { useEffect, useState } from 'react'

const STORAGE_KEY = 'specbridge-settings'

const DEFAULT_SETTINGS = {
  level: '기본',
  defaultCategory: 'AI 자동 감지',
  showTermDescription: true,
  showEasySentence: true,
  showActions: true,
}

const getInitialSettings = () => {
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
    }
  } catch (error) {
    console.error('설정 불러오기 실패:', error)
    return DEFAULT_SETTINGS
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(getInitialSettings)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('설정 저장 실패:', error)
    }
  }, [settings])

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  return (
    <div className="main">
      <section className="hero">
        <h1>설정</h1>
        <p className="lead">앱 기본 동작과 표시 방식을 설정할 수 있습니다. 설정은 브라우저에 저장되어 새로고침 후에도 유지됩니다.</p>
      </section>

      <section className="settings-page">
        <div className="settings-card">
          <div className="settings-group">
            <h3 className="settings-title">설명 수준</h3>
            <div className="radio-group settings-radio-group">
              {['간단', '기본', '자세히'].map((level) => (
                <label key={level} className="settings-option">
                  <input
                    type="radio"
                    name="level"
                    value={level}
                    checked={settings.level === level}
                    onChange={() => updateSetting('level', level)}
                  />
                  <span>{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <h3 className="settings-title">기본 분야</h3>
            <select
              className="settings-select"
              value={settings.defaultCategory}
              onChange={(e) => updateSetting('defaultCategory', e.target.value)}
            >
              <option>AI 자동 감지</option>
              <option>개발·IT</option>
              <option>기획·PM</option>
              <option>디자인·UI·UX</option>
            </select>
          </div>

          <div className="settings-group">
            <h3 className="settings-title">표시 항목</h3>
            <div className="toggle-list">
              <label className="toggle-item">
                <span>전문용어 설명 표시 여부</span>
                <input
                  type="checkbox"
                  checked={settings.showTermDescription}
                  onChange={(e) => updateSetting('showTermDescription', e.target.checked)}
                />
              </label>

              <label className="toggle-item">
                <span>쉬운 문장 표시 여부</span>
                <input
                  type="checkbox"
                  checked={settings.showEasySentence}
                  onChange={(e) => updateSetting('showEasySentence', e.target.checked)}
                />
              </label>

              <label className="toggle-item">
                <span>해야 할 일 표시 여부</span>
                <input
                  type="checkbox"
                  checked={settings.showActions}
                  onChange={(e) => updateSetting('showActions', e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
