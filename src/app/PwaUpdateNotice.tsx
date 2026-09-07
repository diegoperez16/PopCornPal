import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

export default function PwaUpdateNotice() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div
      role="status"
      className="fixed bottom-24 left-4 right-4 z-[550] mx-auto max-w-sm rounded-2xl border border-[#45403b] bg-[#25231f] p-4 shadow-2xl md:bottom-6"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">A fresh batch is ready.</p>
        <button
          aria-label="Dismiss update"
          className="app-icon-button -mr-2"
          onClick={() => setNeedRefresh(false)}
        >
          <X size={18} />
        </button>
      </div>
      <p className="mb-3 text-sm text-gray-300">
        Finish what you’re writing, then reload for the latest Popcorn Pal.
      </p>
      <button
        className="app-button-primary w-full"
        onClick={() => {
          void updateServiceWorker(true)
        }}
      >
        <RefreshCw size={16} /> Update & reload
      </button>
    </div>
  )
}
