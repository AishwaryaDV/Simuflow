import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { uiStore, type CanvasMode } from '../../stores/UIStore'

interface Tool {
  mode:    CanvasMode
  icon:    string
  label:   string
  shortcut?: string
}

const TOOLS: Tool[] = [
  { mode: 'select',    icon: '↖',  label: 'Select',    shortcut: 'V' },
  { mode: 'hand',      icon: '✋',  label: 'Pan',       shortcut: 'H' },
  { mode: 'connect',   icon: '↗',  label: 'Connect',   shortcut: 'C' },
  { mode: 'container', icon: '⬜',  label: 'Container', shortcut: 'B' },
  { mode: 'text',      icon: 'T',  label: 'Text',      shortcut: 'T' },
  { mode: 'eraser',    icon: '⌫',  label: 'Eraser',    shortcut: 'E' },
]

const CURSOR_MAP: Record<CanvasMode, string> = {
  select:    'default',
  hand:      'grab',
  connect:   'crosshair',
  container: 'cell',
  text:      'text',
  eraser:    'not-allowed',
}

/** Exposes the current cursor so CanvasPanel can apply it. */
export function getCursorForMode(mode: CanvasMode): string {
  return CURSOR_MAP[mode]
}

const CanvasToolbar = observer(() => {
  const active = uiStore.canvasMode

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-md px-2 py-1.5">
      {TOOLS.map(({ mode, icon, label, shortcut }) => {
        const isActive = active === mode
        return (
          <button
            key={mode}
            onClick={() => runInAction(() => uiStore.setCanvasMode(mode))}
            title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
            className={[
              'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
            ].join(' ')}
          >
            {icon}
          </button>
        )
      })}

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Mode label */}
      <span className="text-[11px] text-gray-400 pr-1 select-none min-w-[52px]">
        {TOOLS.find(t => t.mode === active)?.label}
      </span>
    </div>
  )
})

export default CanvasToolbar
