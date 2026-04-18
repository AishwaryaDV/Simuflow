import { useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { Lightbulb } from 'lucide-react'
import { uiStore } from '../../stores/UIStore'

/**
 * Draggable floating bulb — visible when a template is loaded.
 * Drag to reposition, click (without dragging) to open design docs.
 */
const TemplateBadge = observer(() => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const btnRef    = useRef<HTMLButtonElement>(null)
  const offset    = useRef({ x: 0, y: 0 })
  const didMove   = useRef(false)

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    didMove.current = false

    const rect = btnRef.current!.getBoundingClientRect()
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    const onMove = (e: MouseEvent) => {
      didMove.current = true
      const parent = btnRef.current?.offsetParent as HTMLElement
      if (!parent) return
      const pr = parent.getBoundingClientRect()
      setPos({
        x: e.clientX - pr.left - offset.current.x,
        y: e.clientY - pr.top  - offset.current.y,
      })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onClick = () => {
    if (didMove.current) return
    runInAction(() => uiStore.openTemplateDetails())
  }

  const style = pos
    ? { left: pos.x, top: pos.y }
    : { left: '62%', top: '50%', transform: 'translateY(-50%)' }

  return (
    <button
      ref={btnRef}
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={style}
      className="absolute z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-yellow-400/15 border border-yellow-400/40 backdrop-blur-sm hover:bg-yellow-400/25 hover:border-yellow-400/70 transition-colors shadow-lg select-none cursor-grab active:cursor-grabbing"
      title="View design explanation"
    >
      <Lightbulb size={15} className="text-yellow-300" />
    </button>
  )
})

export default TemplateBadge
