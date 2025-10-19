
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConversationsSidebar from '@/components/ConversationsSidebar'

export default function MessagesPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <main className="max-w-5xl mx-auto p-4">
      {/* Fixed-height wrapper (adjust 180px if your header/footer height changes) */}
      <div className="h-[calc(100vh-180px)] grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
        {/* Left: sidebar with unread badges (scrolls internally) */}
        <div className="h-full rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <ConversationsSidebar
            selectedId={selected}
            onSelect={(id) => {
              setSelected(id)
              router.push(`/messages/${id}`)
            }}
            height={680}
            className="h-full"
          />
        </div>

        {/* Right: empty state until a thread is selected */}
        <section className="h-full rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center justify-center p-12">
          <div className="text-center max-w-sm">
            <div className="text-2xl font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-transparent bg-clip-text">
              Direct Messages
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Pick a conversation from the left, or open a profile and press <b>Message</b>.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
