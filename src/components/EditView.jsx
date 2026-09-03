import { useState } from 'react'
import { useRoster } from '../context/RosterContext'
import RosterEditor from './RosterEditor'
import OverridesEditor from './OverridesEditor'

export default function EditView() {
  const { resetAll } = useRoster()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="space-y-8">
      {/* 안내 + 전체 초기화 */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-400">
          편집 내용은 이 브라우저에 자동 저장됩니다(localStorage). 서버 저장이 아니므로 다른 기기와
          공유되지 않습니다.
        </p>
        {confirmReset ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-rose-300">모든 편집을 지우고 기본값으로?</span>
            <button
              type="button"
              onClick={() => {
                resetAll()
                setConfirmReset(false)
              }}
              className="rounded border border-rose-600 bg-rose-600/20 px-2 py-1 text-xs text-rose-300"
            >
              확인
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            전체 초기화
          </button>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold text-slate-100">🧬 로스터 편집</h2>
        <RosterEditor />
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-slate-100">⚙️ 매치업 오버라이드</h2>
        <OverridesEditor />
      </section>
    </div>
  )
}
