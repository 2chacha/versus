import { useState } from 'react'
import VsArena from './components/VsArena'
import TeamBattle from './components/TeamBattle'
import NexusMatrix from './components/NexusMatrix'
import EditView from './components/EditView'

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ' +
        (active
          ? 'bg-slate-800 text-slate-100 shadow-inner'
          : 'text-slate-400 hover:text-slate-200')
      }
    >
      {children}
    </button>
  )
}

export default function App() {
  const [view, setView] = useState('arena') // 'arena' | 'map'
  const [aId, setAId] = useState('gojo')
  const [bId, setBId] = useState('sukuna')
  const [simSignal, setSimSignal] = useState(0)

  // 상성 맵에서 매치업을 아레나로 넘길 때: 선택을 세팅하고 자동 시뮬레이션 트리거.
  function openInArena(a, b) {
    setAId(a)
    setBId(b)
    setView('arena')
    setSimSignal((n) => n + 1)
  }

  return (
    <div className="min-h-full">
      {/* 배경 글로우 */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[45vh] w-[45vh] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[45vh] w-[45vh] rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* 헤더 */}
        <header className="mb-6 text-center">
          <h1 className="font-display text-3xl font-black tracking-widest text-slate-100 sm:text-5xl">
            <span className="bg-gradient-to-r from-sky-400 to-rose-400 bg-clip-text text-transparent">
              VERSUS NEXUS
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            스탯 · 티어 · hax 상성 기반 가상 대결 시뮬레이터
          </p>
        </header>

        {/* 뷰 전환 탭 */}
        <div className="mb-8 flex justify-center">
          <div className="flex max-w-full flex-wrap justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            <TabButton active={view === 'arena'} onClick={() => setView('arena')}>
              ⚔️ VS 아레나
            </TabButton>
            <TabButton active={view === 'team'} onClick={() => setView('team')}>
              ⚔️ 팀전
            </TabButton>
            <TabButton active={view === 'map'} onClick={() => setView('map')}>
              🗺️ 상성 맵
            </TabButton>
            <TabButton active={view === 'edit'} onClick={() => setView('edit')}>
              🧬 편집
            </TabButton>
          </div>
        </div>

        {view === 'arena' && (
          <VsArena
            aId={aId}
            bId={bId}
            onAChange={setAId}
            onBChange={setBId}
            simSignal={simSignal}
          />
        )}
        {view === 'team' && <TeamBattle />}
        {view === 'map' && <NexusMatrix onOpenInArena={openInArena} />}
        {view === 'edit' && <EditView />}

        <footer className="mt-12 text-center text-[11px] text-slate-600">
          Versus Nexus · Step 3 · 결정론적 클라이언트 사이드 엔진 (서버/API 없음)
        </footer>
      </div>
    </div>
  )
}
