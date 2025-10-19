

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from './ProfileAvatar'

type Comment = {
  id: number
  post_id: number
  author_id: string
  body: string
  created_at: string
}

type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

export default function CommentList({
  postId,
  refreshToken = 0,
}: {
  postId: number
  refreshToken?: number
}) {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)
  const [busyIds, setBusyIds] = useState<number[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, refreshToken])

  async function fetchComments() {
    setLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('comments fetch error', error)
      setComments([])
      setProfiles({})
      setLoading(false)
      return
    }

    const rows = (data ?? []) as Comment[]
    setComments(rows)
    setLoading(false)

    const ids = Array.from(new Set(rows.map((c) => c.author_id)))
    if (ids.length) {
      const { data: profs, error: perr } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', ids)

      if (!perr) {
        const map: Record<string, Profile> = {}
        for (const p of (profs ?? []) as Profile[]) map[p.id] = p
        setProfiles((prev) => ({ ...prev, ...map }))
      }
    }
  }

  useEffect(() => {
    const channel = supabase.channel(`comments-${postId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          const c = payload.new as Comment
          setComments((prev) => (prev ? [...prev, c] : [c]))
          if (!profiles[c.author_id]) {
            const { data } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', c.author_id)
              .single()
            if (data) setProfiles((p) => ({ ...p, [c.author_id]: data as Profile }))
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const oldRow = payload.old as { id: number }
          setComments((prev) => (prev ? prev.filter((x) => x.id !== oldRow.id) : prev))
        }
      )
    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, profiles])

  useEffect(() => {
    const ch = supabase.channel('profiles-rt-comments')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          const np = payload.new as Profile | null
          const op = payload.old as Profile | null
          const id = np?.id || op?.id
          if (!id) return
          setProfiles((prev) => ({
            ...prev,
            [id]: {
              id,
              username: np?.username ?? prev[id]?.username ?? null,
              full_name: np?.full_name ?? prev[id]?.full_name ?? null,
              avatar_url: np?.avatar_url ?? prev[id]?.avatar_url ?? null,
            },
          }))
        }
      )
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function handleDelete(id: number) {
    setBusyIds((s) => [...s, id])
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) {
      alert(error.message)
      setBusyIds((s) => s.filter((x) => x !== id))
      return
    }
    setComments((prev) => (prev ? prev.filter((c) => c.id !== id) : prev))
  }

  if (loading) return <div className="text-xs text-gray-500 mt-2">Loading comments…</div>
  if (!comments || comments.length === 0) return <div className="text-xs text-gray-500 mt-2">No comments yet.</div>

  return (
    <ul className="mt-2 space-y-2">
      {comments.map((c) => {
        const mine = me && c.author_id === me
        const deleting = busyIds.includes(c.id)
        const prof = profiles[c.author_id]
        const displayName = prof?.full_name || prof?.username || 'User'

        return (
          <li key={c.id} className="p-2 rounded-lg border bg-white">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/profile/${c.author_id}`} className="flex items-start gap-3 group">
                <ProfileAvatar profile={prof} size={28} />
                <div>
                  <div className="text-[13px] font-medium text-gray-900 leading-tight group-hover:underline">
                    {displayName}
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.body}</p>
                  <div className="mt-1 text-[11px] text-gray-400">{new Date(c.created_at).toLocaleString()}</div>
                </div>
              </Link>

              {mine && (
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting}
                  className="text-[11px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
