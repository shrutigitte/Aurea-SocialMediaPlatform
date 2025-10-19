'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from '@/components/ProfileAvatar'

type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

type Post = {
  id: number
  author_id: string
  content: string | null
  image_url: string | null
  created_at: string
}

type Tab = 'users' | 'posts'

export default function ExplorePage() {
  const params = useSearchParams()
  const router = useRouter()

  const initialQ = params.get('q') ?? ''
  const initialTab = (params.get('t') as Tab) ?? 'users'

  const [q, setQ] = useState(initialQ)
  const [tab, setTab] = useState<Tab>(initialTab)

  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({})

  // keep URL in sync (clean, shareable)
  useEffect(() => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (tab !== 'users') sp.set('t', tab)
    const qs = sp.toString()
    router.replace(qs ? `/explore?${qs}` : '/explore')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tab])

  // Simple debounce for search
  useEffect(() => {
    let active = true
    const t = setTimeout(() => {
      if (!active) return
      void runSearch()
    }, 250)
    return () => {
      active = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tab])

  const canSearch = useMemo(() => (q.trim().length >= 2), [q])

  async function runSearch() {
    if (!canSearch) {
      setUsers([])
      setPosts([])
      return
    }
    setLoading(true)

    if (tab === 'users') {
      // Search profiles by username OR full name
      const like = `%${q.trim()}%`
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .or(`username.ilike.${like},full_name.ilike.${like}`)
        .limit(20)
      if (error) console.error('users search error', error)
      setUsers((data as Profile[]) ?? [])
    } else {
      // Search posts by content substring
      const like = `%${q.trim()}%`
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .ilike('content', like)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) console.error('posts search error', error)
      const rows = (data as Post[]) ?? []
      setPosts(rows)

      // fetch authors for cards
      const ids = Array.from(new Set(rows.map((p) => p.author_id)))
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', ids)
        const m: Record<string, Profile> = {}
        for (const p of (profs as Profile[]) ?? []) m[p.id] = p
        setProfilesMap(m)
      } else {
        setProfilesMap({})
      }
    }

    setLoading(false)
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-semibold">Explore</h1>

      {/* search box */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users or posts…"
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setTab('users')}
            className={tab === 'users'
              ? 'px-3 py-2 text-white bg-gray-900'
              : 'px-3 py-2 hover:bg-gray-50'}
          >
            Users
          </button>
          <button
            onClick={() => setTab('posts')}
            className={tab === 'posts'
              ? 'px-3 py-2 text-white bg-gray-900'
              : 'px-3 py-2 hover:bg-gray-50'}
          >
            Posts
          </button>
        </div>
      </div>

      {/* hints */}
      {!canSearch && (
        <p className="mt-3 text-sm text-gray-500">
          Type at least <span className="font-medium">2 characters</span> to search.
        </p>
      )}
      {loading && <p className="mt-4 text-sm text-gray-500">Searching…</p>}

      {/* users tab */}
      {canSearch && tab === 'users' && !loading && (
        <ul className="mt-4 space-y-3">
          {users.length === 0 && (
            <li className="text-sm text-gray-500">No users found.</li>
          )}
          {users.map((u) => {
            const href = u.username ? `/u/${encodeURIComponent(u.username)}` : `/profile/${u.id}`
            return (
              <li key={u.id} className="p-3 border rounded-xl bg-white shadow-sm hover:shadow transition">
                <Link href={href} className="flex items-center gap-3">
                  <ProfileAvatar profile={u} size={40} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {u.full_name || u.username || 'User'}
                    </div>
                    {u.username && (
                      <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                    )}
                    {u.bio && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{u.bio}</div>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {/* posts tab */}
      {canSearch && tab === 'posts' && !loading && (
        <ul className="mt-4 space-y-4">
          {posts.length === 0 && (
            <li className="text-sm text-gray-500">No posts found.</li>
          )}
          {posts.map((p) => {
            const author = profilesMap[p.author_id]
            const authorHref = author?.username
              ? `/u/${encodeURIComponent(author.username!)}`
              : `/profile/${p.author_id}`
            const authorName = author?.full_name || author?.username || 'User'
            return (
              <li key={p.id} className="p-4 border rounded-xl bg-white shadow">
                <div className="flex items-center justify-between gap-3">
                  <Link href={authorHref} className="flex items-center gap-3 group">
                    <ProfileAvatar profile={author as any} size={36} />
                    <div className="leading-tight">
                      <div className="text-sm font-medium text-gray-900 group-hover:underline">
                        {authorName}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(p.created_at).toLocaleString()}
                      </div>
                    </div>
                  </Link>
                  <Link
                    href={`/post/${p.id}`}
                    className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                  >
                    Open
                  </Link>
                </div>

                {p.content && (
                  <Link href={`/post/${p.id}`} className="block mt-3 hover:underline">
                    <p className="text-gray-800 whitespace-pre-wrap">{p.content}</p>
                  </Link>
                )}
                {p.image_url && (
                  <Link href={`/post/${p.id}`} className="block mt-3">
                    <img
                      src={p.image_url}
                      alt="Post image"
                      className="w-full max-h-[420px] object-cover rounded-lg border"
                      loading="lazy"
                    />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
