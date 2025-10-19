'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from '@/components/ProfileAvatar'

type Profile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }
type Convo = { id: number; user_a: string; user_b: string; last_message_at: string }

export default function ConversationsList() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const activeId = useMemo(() => {
    const id = Array.isArray(params?.id) ? params?.id?.[0] : (params?.id as string | undefined)
    return id ? Number(id) : null
  }, [params])

  const [me, setMe] = useState<string | null>(null)
  const [rows, setRows] = useState<Convo[]>([])
  const [people, setPeople] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!me) return
    const refresh = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('conversations')
        .select('id, user_a, user_b, last_message_at')
        .order('last_message_at', { ascending: false })
      if (error) { setRows([]); setLoading(false); return }
      const list = (data ?? []) as Convo[]
      setRows(list)

      const ids = Array.from(new Set(list.map(c => c.user_a === me ? c.user_b : c.user_a)))
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', ids)
        const map: Record<string, Profile> = {}
        for (const p of (profs ?? []) as Profile[]) map[p.id] = p
        setPeople(map)
      } else {
        setPeople({})
      }
      setLoading(false)
    }
    refresh()

    const ch = supabase
      .channel('convo-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [me])

  if (!me) return null

  return (
    <aside className="w-full sm:w-72 shrink-0 border-r bg-white">
      <div className="p-3 border-b">
        <h2 className="text-sm font-semibold text-gray-800">Messages</h2>
      </div>

      {loading ? (
        <div className="p-3 text-xs text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-xs text-gray-500">No conversations yet.</div>
      ) : (
        <ul className="divide-y">
          {rows.map(c => {
            const otherId = c.user_a === me ? c.user_b : c.user_a
            const other = people[otherId]
            const who = other?.full_name || other?.username || 'User'
            const isActive = activeId === c.id || pathname === `/messages/${c.id}`
            return (
              <li
                key={c.id}
                className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${isActive ? 'bg-purple-50' : ''}`}
                onClick={() => router.push(`/messages/${c.id}`)}
              >
                <ProfileAvatar profile={other as any} size={36} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{who}</div>
                  <div className="text-[11px] text-gray-400">{new Date(c.last_message_at).toLocaleString()}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
