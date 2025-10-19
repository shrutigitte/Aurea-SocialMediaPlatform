
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from '@/components/ProfileAvatar'

type Notif = {
  id: number
  user_id: string
  kind: 'like' | 'comment' | 'follow'
  actor_id: string | null
  post_id: number | null
  read: boolean
  created_at: string
}

type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

type Post = { id: number; image_url: string | null }

export default function NotificationsPage() {
  const [me, setMe] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Notif[]>([])
  const [actors, setActors] = useState<Record<string, Profile>>({})
  const [posts, setPosts] = useState<Record<number, Post>>({})
  const [busyAll, setBusyAll] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!me) return
    fetchList()

    const ch = supabase
      .channel('notif-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${me}` },
        () => fetchList()
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  async function fetchList() {
    if (!me) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, kind, actor_id, post_id, read, created_at')
      .eq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) { setRows([]); setActors({}); setPosts({}); setLoading(false); return }
    const list = (data ?? []) as Notif[]
    setRows(list)

    const actorIds = Array.from(new Set(list.map(n => n.actor_id).filter(Boolean))) as string[]
    if (actorIds.length) {
      const { data: a } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', actorIds)
      const map: Record<string, Profile> = {}
      for (const p of (a ?? []) as Profile[]) map[p.id] = p
      setActors(map)
    } else {
      setActors({})
    }

    const postIds = Array.from(new Set(list.map(n => n.post_id).filter(Boolean))) as number[]
    if (postIds.length) {
      const { data: p } = await supabase
        .from('posts')
        .select('id, image_url')
        .in('id', postIds)
      const map: Record<number, Post> = {}
      for (const po of (p ?? []) as Post[]) map[po.id] = po
      setPosts(map)
    } else {
      setPosts({})
    }

    setLoading(false)
  }

  async function markAllRead() {
    if (!me) return
    setBusyAll(true)
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', me)
      .eq('read', false)
    if (!error) setRows(r => r.map(n => ({ ...n, read: true })))
    setBusyAll(false)
  }

  async function markOneRead(id: number) {
    const idx = rows.findIndex(n => n.id === id)
    if (idx === -1) return
    setRows(r => r.map(n => (n.id === id ? { ...n, read: true } : n)))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) fetchList()
  }

  const title = useMemo(
    () => (rows.some(r => !r.read) ? 'Notifications • Unread' : 'Notifications'),
    [rows]
  )

  if (!me) {
    return <main className="max-w-2xl mx-auto p-4">Please sign in to view notifications.</main>
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      {/* top accent */}
      <div className="h-1 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 mb-4" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
          {title}
        </h1>
        <button
          onClick={markAllRead}
          disabled={busyAll || rows.every(r => r.read)}
          className="text-xs px-3 py-1.5 rounded-full text-white disabled:opacity-50 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90"
        >
          Mark all as read
        </button>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-5 p-8 text-center text-sm text-gray-500 border rounded-2xl bg-white">
          No notifications yet.
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map(n => {
            const actor = n.actor_id ? actors[n.actor_id] : undefined
            const who = actor?.full_name || actor?.username || 'Someone'
            const actorHref = actor?.username ? `/u/${encodeURIComponent(actor.username)}` : (actor ? `/profile/${actor.id}` : '#')
            const postHref = n.post_id ? `/post/${n.post_id}` : undefined

            let line = ''
            if (n.kind === 'like') line = 'liked your post'
            if (n.kind === 'comment') line = 'commented on your post'
            if (n.kind === 'follow') line = 'started following you'

            return (
              <li
                key={n.id}
                className={`p-3 border rounded-2xl bg-white shadow-sm flex items-center justify-between gap-3 ${n.read ? 'border-purple-100/60' : 'border-purple-300/60'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProfileAvatar profile={actor as any} size={40} />
                  <div className="min-w-0">
                    <div className="text-sm">
                      <Link href={actorHref} className="font-semibold text-gray-900 hover:underline">
                        {who}
                      </Link>{' '}
                      <span className="text-gray-700">{line}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {postHref && posts[n.post_id!] && posts[n.post_id!].image_url && (
                    <Link href={postHref} className="block">
                      <img
                        src={posts[n.post_id!].image_url!}
                        alt="Post"
                        className="w-12 h-12 object-cover rounded-xl border"
                      />
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => markOneRead(n.id)}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
