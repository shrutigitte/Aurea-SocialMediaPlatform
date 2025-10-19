'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from './ProfileAvatar'

type Row = {
  id: number
  other_id: string
  last_message_at: string
  unread: number
}

type Profile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export default function ConversationsSidebar({
  selectedId,
  onSelect,
  className = '',
  height = 640,
}: {
  selectedId: number | null
  onSelect: (id: number) => void
  className?: string
  height?: number
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [me, setMe] = useState<string | null>(null)

  // fetch me
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  // fetch list (rpc) + profile cache
  async function load() {
    const { data, error } = await supabase.rpc('conversations_overview')
    if (error) {
      console.error(error)
      return
    }
    const r = (data ?? []) as Row[]
    setRows(r)
    const ids = Array.from(new Set(r.map(x => x.other_id)))
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id,full_name,username,avatar_url')
        .in('id', ids)
      const map: Record<string, Profile> = {}
      for (const p of (profs ?? []) as Profile[]) map[p.id] = p
      setProfiles(prev => ({ ...map, ...prev }))
    }
  }

  useEffect(() => { load() }, [])

  // realtime: new messages / reads
  useEffect(() => {
    const ch = supabase.channel('convos-sidebar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new as any
        setRows(prev => {
          // bump convo to top
          const next = prev.filter(x => x.id !== m.conversation_id)
          const existing = prev.find(x => x.id === m.conversation_id)
          const unreadInc = me && m.sender_id !== me ? 1 : 0
          if (existing) {
            next.unshift({
              ...existing,
              last_message_at: m.created_at,
              unread: (existing.unread ?? 0) + unreadInc,
            })
          } else {
            next.unshift({
              id: m.conversation_id,
              other_id: me && m.sender_id !== me ? m.sender_id : m.conversation_id, // fallback; fixed on reload
              last_message_at: m.created_at,
              unread: unreadInc,
            } as any)
          }
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reads' }, () => {
        // someone marked read (likely me) – refresh lightweight
        load()
      })
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  const items = useMemo(
    () => rows.sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at)),
    [rows]
  )

  return (
    <aside
      className={
        'w-full sm:w-80 border-r bg-white rounded-l-xl overflow-hidden ' +
        className
      }
      style={{ height }}
    >
      <div className="px-3 py-2 border-b bg-white/80 sticky top-0 z-10">
        <h2 className="text-sm font-semibold tracking-wide text-gray-700">Messages</h2>
      </div>

      <div className="overflow-y-auto" style={{ height: height - 44 }}>
        {items.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No conversations yet.</div>
        )}
        {items.map((row) => {
          const p = profiles[row.other_id]
          const name = p?.full_name || p?.username || 'User'
          const active = selectedId === row.id
          return (
            <button
              key={row.id}
              onClick={() => onSelect(row.id)}
              className={
                'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-purple-50/60 ' +
                (active ? 'bg-purple-50' : '')
              }
            >
              <ProfileAvatar profile={p as any} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="truncate text-[13px] font-medium text-gray-900">{name}</div>
                  {row.unread > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center text-[10px] font-semibold text-white rounded-full px-2 py-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
                      {row.unread}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400">
                  {new Date(row.last_message_at).toLocaleString()}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
