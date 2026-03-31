import { useState } from 'react'
import { ScheduleOptimizer } from './components/ScheduleOptimizer'
import { InterestSearch } from './components/InterestSearch'
import { Settings } from './components/Settings'
import './styles.css'

type Tab = 'optimizer' | 'discover' | 'settings'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('optimizer')

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1 className="popup-title">BIA Course Helper</h1>
        <span className="popup-subtitle">by BIA Community</span>
      </header>

      <nav className="popup-tabs">
        <button
          className={`popup-tab ${activeTab === 'optimizer' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimizer')}
          aria-pressed={activeTab === 'optimizer'}
        >
          Optimizer
        </button>
        <button
          className={`popup-tab ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveTab('discover')}
          aria-pressed={activeTab === 'discover'}
        >
          Discover
        </button>
        <button
          className={`popup-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          aria-pressed={activeTab === 'settings'}
        >
          Settings
        </button>
      </nav>

      <main className="popup-content">
        {activeTab === 'optimizer' && <ScheduleOptimizer />}
        {activeTab === 'discover' && <InterestSearch />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  )
}
