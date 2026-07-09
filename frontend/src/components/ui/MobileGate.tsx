import { Monitor } from 'lucide-react'

export default function MobileGate() {
  return (
    <div className="fixed inset-0 z-[9999] bg-app-bg flex flex-col items-center justify-center p-8 text-center md:hidden">
      <div className="w-14 h-14 rounded-2xl bg-app-elevated border border-app-border flex items-center justify-center mb-5">
        <Monitor size={24} className="text-app-accent" />
      </div>
      <h1 className="text-lg font-bold text-app-text">Desktop or tablet required</h1>
      <p className="text-sm text-app-text-3 mt-2 max-w-xs leading-relaxed">
        SimuFlow is a canvas-based simulation tool designed for larger screens. Please open it on a desktop or tablet for the best experience.
      </p>
    </div>
  )
}
