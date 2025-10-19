'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function MarkReadEffect({ conversationId }: { conversationId: number | null }) {
  useEffect(() => {
    if (!conversationId) return

    async function mark() {
      await supabase.rpc('mark_conversation_read', { cid: conversationId })
    }

    // mark on mount & when window gains focus
    mark()
    const onFocus = () => mark()
    window.addEventListener('focus', onFocus)

    // mark on new incoming message events for this convo
    const ch = supabase.channel(`markread-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async () => { await mark() }
      )
    ch.subscribe()

    return () => {
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(ch)
    }
  }, [conversationId])

  return null
}
