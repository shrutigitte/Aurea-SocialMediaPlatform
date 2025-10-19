
'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import CommentBox from './CommentBox'
import CommentList from './CommentList'
import ProfileAvatar from './ProfileAvatar'

type Post = {
  id: number
  author_id: string
  content: string | null
  image_url: string | null
  created_at: string
}
type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

const PAGE_SIZE = 10

export default function PostFeed() {
  // core
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingFirst, setLoadingFirst] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<{ ts: string; id: number } | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // auth
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // busy/delete confirm
  const [busyIds, setBusyIds] = useState<number[]>([])
  const [confirmId, setConfirmId] = useState<number | null>(null)

  // counts + liked state
  const [likeCount, setLikeCount] = useState<Record<number, number>>({})
  const [commentCount, setCommentCount] = useState<Record<number, number>>({})
  const [likedByMe, setLikedByMe] = useState<Record<number, boolean>>({})

  // comments UI state
  const [openCommentId, setOpenCommentId] = useState<number | null>(null)
  const [commentRefresh, setCommentRefresh] = useState<Record<number, number>>({})

  // profiles cache
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})

  // ---------- AUTH + FIRST PAGE ----------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
    fetchFirst()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchFirst() {
    setLoadingFirst(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      console.error('fetchFirst error', error)
      setPosts([])
      setHasMore(false)
      setLoadingFirst(false)
      return
    }

    const rows = (data ?? []) as Post[]
    setPosts(rows)
    setHasMore(rows.length === PAGE_SIZE)
    if (rows.length) {
      const last = rows[rows.length - 1]
      setCursor({ ts: last.created_at, id: last.id })
      const ids = rows.map((p) => p.id)
      const authorIds = Array.from(new Set(rows.map((p) => p.author_id)))
      void fetchCounts(ids)
      void fetchLikedState(ids)
      if (authorIds.length) void fetchProfiles(authorIds)
    }
    setLoadingFirst(false)
  }

  async function fetchMore() {
    if (!hasMore || !cursor || loadingMore) return
    setLoadingMore(true)

    const iso = cursor.ts
    const or =
      `created_at.lt.${iso},and(created_at.eq.${iso},id.lt.${cursor.id})`

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .or(or)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      console.error('fetchMore error', error)
      setLoadingMore(false)
      return
    }

    const rows = (data ?? []) as Post[]
    // de-dupe against current list
    const existing = new Set(posts.map((p) => p.id))
    const fresh = rows.filter((p) => !existing.has(p.id))

    if (fresh.length) {
      setPosts((prev) => [...prev, ...fresh])
      const ids = fresh.map((p) => p.id)
      const authorIds = Array.from(new Set(fresh.map((p) => p.author_id)))
      void fetchCounts(ids)
      void fetchLikedState(ids)
      if (authorIds.length) void fetchProfiles(authorIds)
      const last = fresh[fresh.length - 1]
      setCursor({ ts: last.created_at, id: last.id })
    }

    setHasMore(rows.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMore) return
    const el = loadMoreRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMore()
      },
      { rootMargin: '600px' } // prefetch comfortably before bottom
    )
    obs.observe(el)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, cursor, posts.length])

  // ---------- HELPERS (profiles / counts / liked) ----------
  async function fetchProfiles(userIds: string[]) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds)

    if (error) return console.error('profiles fetch error', error)
    const map: Record<string, Profile> = {}
    for (const p of (data ?? []) as Profile[]) map[p.id] = p
    setProfiles((prev) => ({ ...prev, ...map }))
  }

  async function fetchCounts(ids: number[]) {
    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabase.from('likes').select('post_id').in('post_id', ids),
      supabase.from('comments').select('post_id').in('post_id', ids),
    ])

    const likeMap: Record<number, number> = {}
    const cmtMap: Record<number, number> = {}

    for (const row of (likes ?? []) as any[]) {
      likeMap[row.post_id] = (likeMap[row.post_id] ?? 0) + 1
    }
    for (const row of (comments ?? []) as any[]) {
      cmtMap[row.post_id] = (cmtMap[row.post_id] ?? 0) + 1
    }

    setLikeCount((m) => ({ ...m, ...likeMap }))
    setCommentCount((m) => ({ ...m, ...cmtMap }))
  }

  async function fetchLikedState(ids: number[]) {
    if (!currentUserId || ids.length === 0) return
    const { data, error } = await supabase
      .from('likes')
      .select('post_id, user_id')
      .eq('user_id', currentUserId)
      .in('post_id', ids)

    if (error) return console.error('liked state error', error)

    const map: Record<number, boolean> = {}
    for (const row of (data ?? []) as any[]) map[row.post_id] = true
    setLikedByMe((m) => ({ ...m, ...map }))
  }

  // ---------- LIKE / DELETE ----------
  async function toggleLike(postId: number) {
    if (!currentUserId) {
      alert('Please sign in to like posts.')
      return
    }
    const currentlyLiked = !!likedByMe[postId]

    // optimistic UI
    setLikedByMe((m) => ({ ...m, [postId]: !currentlyLiked }))
    setLikeCount((m) => ({
      ...m,
      [postId]: Math.max(0, (m[postId] ?? 0) + (currentlyLiked ? -1 : 1)),
    }))

    if (currentlyLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
      if (error) {
        setLikedByMe((m) => ({ ...m, [postId]: true }))
        setLikeCount((m) => ({ ...m, [postId]: (m[postId] ?? 0) + 1 }))
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: currentUserId })
      if (error) {
        setLikedByMe((m) => ({ ...m, [postId]: false }))
        setLikeCount((m) => ({ ...m, [postId]: Math.max(0, (m[postId] ?? 0) - 1) }))
      }
    }
  }

  async function handleDeleteConfirmed(id: number) {
    setBusyIds((s) => [...s, id])
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) {
      alert(error.message)
      setBusyIds((s) => s.filter((x) => x !== id))
      return
    }
    setConfirmId(null)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  // ---------- REALTIME (posts/likes/comments) ----------
  useEffect(() => {
    const channel = supabase.channel('realtime-feed')

    // Posts inserts
    channel.on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'posts' },
      (payload) => {
        const p = payload.new as Post
        setPosts((prev) => (prev.some(x => x.id === p.id) ? prev : [p, ...prev]))
        setLikeCount((m) => ({ ...m, [p.id]: 0 }))
        setCommentCount((m) => ({ ...m, [p.id]: 0 }))
        if (!profiles[p.author_id]) fetchProfiles([p.author_id])
      }
    )
    // Posts deletes
    channel.on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'posts' },
      (payload) => {
        const oldRow = payload.old as { id: number }
        setPosts((prev) => prev.filter((x) => x.id !== oldRow.id))
      }
    )
    // Likes
    channel.on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'likes' },
      (payload) => {
        const row = payload.new as any
        setLikeCount((m) => ({ ...m, [row.post_id]: (m[row.post_id] ?? 0) + 1 }))
        if (row.user_id === currentUserId) {
          setLikedByMe((m) => ({ ...m, [row.post_id]: true }))
        }
      }
    )
    channel.on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'likes' },
      (payload) => {
        const row = payload.old as any
        setLikeCount((m) => ({ ...m, [row.post_id]: Math.max(0, (m[row.post_id] ?? 0) - 1) }))
        if (row.user_id === currentUserId) {
          setLikedByMe((m) => ({ ...m, [row.post_id]: false }))
        }
      }
    )
    // Comments
    channel.on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comments' },
      (payload) => {
        const row = payload.new as any
        setCommentCount((m) => ({ ...m, [row.post_id]: (m[row.post_id] ?? 0) + 1 }))
        if (openCommentId === row.post_id) {
          setCommentRefresh((m) => ({ ...m, [row.post_id]: (m[row.post_id] ?? 0) + 1 }))
        }
      }
    )
    channel.on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'comments' },
      (payload) => {
        const row = payload.old as any
        setCommentCount((m) => ({ ...m, [row.post_id]: Math.max(0, (m[row.post_id] ?? 0) - 1) }))
        if (openCommentId === row.post_id) {
          setCommentRefresh((m) => ({ ...m, [row.post_id]: (m[row.post_id] ?? 0) + 1 }))
        }
      }
    )

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, openCommentId, profiles])

  // ---------- UI ----------
  if (loadingFirst) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-xl bg-white shadow animate-pulse">
            <div className="h-4 w-1/3 bg-gray-200 rounded" />
            <div className="mt-3 h-3 w-2/3 bg-gray-200 rounded" />
            <div className="mt-3 h-40 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return <div className="text-sm text-gray-500">No posts yet.</div>
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map((p) => {
          const isOwner = currentUserId && p.author_id === currentUserId
          const deleting = busyIds.includes(p.id)
          const isConfirming = confirmId === p.id
          const liked = !!likedByMe[p.id]
          const isOpen = openCommentId === p.id

          const prof = profiles[p.author_id]
          const displayName = prof?.full_name || prof?.username || 'User'

          return (
            <article key={p.id} className="relative p-4 border rounded-2xl bg-white shadow-sm hover:shadow transition">
              {/* header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ProfileAvatar profile={prof} size={36} />
                  <div className="leading-tight">
                    <div className="text-sm font-medium text-gray-900">{displayName}</div>
                    <div className="text-[11px] text-gray-400">{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setConfirmId(isConfirming ? null : p.id)}
                    disabled={deleting}
                    className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    aria-haspopup="dialog"
                    aria-expanded={isConfirming}
                    aria-controls={`confirm-${p.id}`}
                    title="Delete post"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>

              {/* content */}
              {p.content && <p className="mt-3 text-gray-800 whitespace-pre-wrap">{p.content}</p>}
              {p.image_url && (
                <div className="mt-3">
                  <img
                    src={p.image_url}
                    alt="Post image"
                    className="w-full max-h-[520px] object-cover rounded-xl border"
                    loading="lazy"
                  />
                </div>
              )}

              {/* actions + counts */}
              <div className="mt-3 flex items-center flex-wrap gap-2">
                <button
                  onClick={() => toggleLike(p.id)}
                  className={
                    liked
                      ? 'text-xs px-3 py-1 rounded text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition'
                      : 'text-xs px-3 py-1 rounded border border-purple-200 text-purple-700 hover:bg-purple-50 transition'
                  }
                >
                  {liked ? '♥ Liked' : '♡ Like'}
                </button>

                <button
                  onClick={() => setOpenCommentId(isOpen ? null : p.id)}
                  className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 transition"
                >
                  {isOpen ? 'Hide comments' : 'Comment'}
                </button>

                <span className="text-xs text-gray-600">
                  {(likeCount[p.id] ?? 0)} likes · {(commentCount[p.id] ?? 0)} comments
                </span>
              </div>

              {isOpen && (
                <>
                  <CommentBox
                    postId={p.id}
                    onCommentAdded={() => {
                      setCommentCount((m) => ({ ...m, [p.id]: (m[p.id] ?? 0) + 1 }))
                      setCommentRefresh((m) => ({ ...m, [p.id]: (m[p.id] ?? 0) + 1 }))
                    }}
                  />
                  <CommentList postId={p.id} refreshToken={commentRefresh[p.id] || 0} />
                </>
              )}

              {/* confirmation popover */}
              {isOwner && isConfirming && (
                <div
                  id={`confirm-${p.id}`}
                  role="dialog"
                  aria-label="Confirm delete"
                  className="absolute right-3 top-3 z-10 w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-3"
                >
                  <p className="text-sm text-gray-800">Delete this post?</p>
                  <p className="mt-1 text-xs text-gray-500">This action can’t be undone.</p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteConfirmed(p.id)}
                      className="px-3 py-1 rounded text-white text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {/* Infinite scroll sentinel + fallback */}
      <div ref={loadMoreRef} className="h-10" />
      <div className="mt-2 flex items-center justify-center">
        {loadingMore ? (
          <span className="text-xs text-gray-500">Loading more…</span>
        ) : hasMore ? (
          <button
            onClick={fetchMore}
            className="text-xs px-3 py-1.5 rounded-full text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90"
          >
            Load more
          </button>
        ) : (
          <span className="text-xs text-gray-400">You’re all caught up.</span>
        )}
      </div>
    </>
  )
}
