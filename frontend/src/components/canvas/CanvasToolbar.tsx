import { useState, useRef, useCallback, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { uiStore, type CanvasMode } from '../../stores/UIStore'
import { MousePointer2, Hand, ArrowUpRight, Square, Type, Eraser, GripVertical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Tool {
  mode:     CanvasMode
  icon:     LucideIcon
  label:    string
  shortcut: string
}

const TOOLS: Tool[] = [
  { mode: 'select',    icon: MousePointer2, label: 'Select',    shortcut: 'V' },
  { mode: 'hand',      icon: Hand,          label: 'Pan',       shortcut: 'H' },
  { mode: 'connect',   icon: ArrowUpRight,  label: 'Connect — click or drag', shortcut: 'C' },
  { mode: 'container', icon: Square,        label: 'Container', shortcut: 'B' },
  { mode: 'text',      icon: Type,          label: 'Text',      shortcut: 'T' },
  { mode: 'eraser',    icon: Eraser,        label: 'Eraser',    shortcut: 'E' },
]

const CURSOR_MAP: Record<CanvasMode, string> = {
  select:    'default',
  hand:      'grab',
  connect:   'crosshair',
  container: 'cell',
  text:      'text',
  eraser:    'not-allowed',
}

export function getCursorForMode(mode: CanvasMode): string {
  return CURSOR_MAP[mode]
}

const CanvasToolbar = observer(() => {
  const active = uiStore.canvasMode
  const [tooltip, setTooltip] = useState<string | null>(null)

  // ── Drag to reposition ────────────────────────────────────────────────────
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const barRef  = useRef<HTMLDivElement>(null)

  const onGripDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = {
      startX:  e.clientX,
      startY:  e.clientY,
      originX: rect.left,
      originY: rect.top,
    }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPos({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy })
    }
    const onUp = () => { dragRef.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  const style = pos
    ? { position: 'fixed' as const, left: pos.x, top: pos.y, transform: 'none' }
    : { position: 'absolute' as const, top: 12, left: '50%', transform: 'translateX(-50%)' }

  return (
    <div
      ref={barRef}
      style={style}
      className="z-10 flex items-center gap-0.5 bg-app-surface border border-app-border rounded-xl shadow-lg shadow-black/30 px-1.5 py-1.5"
    >
      {/* Drag handle */}
      <div
        onMouseDown={onGripDown}
        className="flex items-center justify-center w-5 h-8 text-app-text-3 hover:text-app-text-2 cursor-grab active:cursor-grabbing mr-0.5"
      >
        <GripVertical size={13} strokeWidth={1.8} />
      </div>

      {/* Tool buttons */}
      {TOOLS.map(({ mode, icon: Icon, label, shortcut }) => {
        const isActive = active === mode
        return (
          <div key={mode} className="relative">
            <button
              onClick={() => runInAction(() => uiStore.setCanvasMode(mode))}
              onMouseEnter={() => setTooltip(mode)}
              onMouseLeave={() => setTooltip(null)}
              className={[
                'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
                isActive
                  ? 'bg-app-accent text-white shadow-sm'
                  : 'text-app-text-2 hover:bg-app-elevated hover:text-app-text',
              ].join(' ')}
            >
              <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
            </button>

            {/* Tooltip */}
            {tooltip === mode && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 pointer-events-none z-50">
                <div className="bg-app-elevated border border-app-border rounded-md px-2 py-1 shadow-md whitespace-nowrap">
                  <span className="text-[11px] text-app-text">{label}</span>
                  <span className="ml-1.5 text-[10px] text-app-text-3 font-mono">{shortcut}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})

export default CanvasToolbar
