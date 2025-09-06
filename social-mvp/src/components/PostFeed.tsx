
// 'use client'

// import { useEffect, useState } from 'react'
// import { supabase } from '@/lib/supabaseClient'

// type Post = {
//   id: number
//   author_id: string
//   content: string
//   created_at: string
// }

// export default function PostFeed() {
//   const [posts, setPosts] = useState<Post[] | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [currentUserId, setCurrentUserId] = useState<string | null>(null)
//   const [busyIds, setBusyIds] = useState<number[]>([])
//   const [confirmId, setConfirmId] = useState<number | null>(null)
//   const [likeCount, setLikeCount] = useState<Record<number, number>>({})
//   const [commentCount, setCommentCount] = useState<Record<number, number>>({})

//   useEffect(() => {
//     supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
//     fetchPosts()
//   }, [])

//   async function fetchPosts() {
//     setLoading(true)
//     const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
//     if (error) { console.error(error); setPosts([]); setLoading(false); return }
//     setPosts(data ?? []); setLoading(false)
//     const ids = (data ?? []).map(p => p.id)
//     if (ids.length) void fetchCounts(ids)
//   }

//   async function fetchCounts(ids: number[]) {
//     const [{ data: likes }, { data: comments }] = await Promise.all([
//       supabase.from('likes').select('post_id').in('post_id', ids),
//       supabase.from('comments').select('post_id').in('post_id', ids),
//     ])
//     const likeMap: Record<number, number> = {}
//     const cmtMap: Record<number, number> = {}
//     for (const r of likes ?? []) likeMap[r.post_id] = (likeMap[r.post_id] ?? 0) + 1
//     for (const r of comments ?? []) cmtMap[r.post_id] = (cmtMap[r.post_id] ?? 0) + 1
//     setLikeCount(likeMap); setCommentCount(cmtMap)
//   }

//   async function handleDeleteConfirmed(id: number) {
//     setBusyIds(s => [...s, id])
//     const { error } = await supabase.from('posts').delete().eq('id', id)
//     if (error) { alert(error.message); setBusyIds(s => s.filter(x => x !== id)); return }
//     setConfirmId(null)
//     setPosts(prev => prev ? prev.filter(p => p.id !== id) : prev)
//   }

//   if (loading) return <div className="text-sm text-gray-500">Loading posts…</div>
//   if (!posts || posts.length === 0) return <div className="text-sm text-gray-500">No posts yet.</div>

//   return (
//     <div className="space-y-4">
//       {posts.map((p) => {
//         const isOwner = currentUserId && p.author_id === currentUserId
//         const deleting = busyIds.includes(p.id)
//         const isConfirming = confirmId === p.id

//         return (
//           <article key={p.id} className="relative p-4 border rounded-xl bg-white shadow">
//             <div className="flex items-start justify-between gap-3">
//               <div className="flex-1">
//                 <p className="text-gray-800 whitespace-pre-wrap">{p.content}</p>
//                 <div className="mt-2 text-xs text-gray-600">
//                   {(likeCount[p.id] ?? 0)} likes · {(commentCount[p.id] ?? 0)} comments
//                 </div>
//                 <div className="mt-1 text-[11px] text-gray-400">
//                   {new Date(p.created_at).toLocaleString()}
//                 </div>
//               </div>

//               {isOwner && (
//                 <button
//                   onClick={() => setConfirmId(isConfirming ? null : p.id)}
//                   disabled={deleting}
//                   className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
//                   aria-haspopup="dialog"
//                   aria-expanded={isConfirming}
//                   aria-controls={`confirm-${p.id}`}
//                   title="Delete post"
//                 >
//                   {deleting ? 'Deleting…' : 'Delete'}
//                 </button>
//               )}
//             </div>

//             {isOwner && isConfirming && (
//               <div
//                 id={`confirm-${p.id}`}
//                 role="dialog"
//                 aria-label="Confirm delete"
//                 className="absolute right-3 top-3 z-10 w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-3"
//               >
//                 <p className="text-sm text-gray-800">Delete this post?</p>
//                 <p className="mt-1 text-xs text-gray-500">This action can’t be undone.</p>
//                 <div className="mt-3 flex items-center justify-end gap-2">
//                   <button
//                     onClick={() => setConfirmId(null)}
//                     className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 text-sm"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     onClick={() => handleDeleteConfirmed(p.id)}
//                     disabled={deleting}
//                     className="px-3 py-1 rounded text-white text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50 transition"
//                   >
//                     Confirm
//                   </button>
//                 </div>
//               </div>
//             )}
//           </article>
//         )
//       })}
//     </div>
//   )
// }
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Post = {
  id: number
  author_id: string
  content: string
  created_at: string
}

export default function PostFeed() {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [busyIds, setBusyIds] = useState<number[]>([])
  const [confirmId, setConfirmId] = useState<number | null>(null)

  // counts + liked state
  const [likeCount, setLikeCount] = useState<Record<number, number>>({})
  const [commentCount, setCommentCount] = useState<Record<number, number>>({})
  const [likedByMe, setLikedByMe] = useState<Record<number, boolean>>({})

  useEffect(() => {
    // who am I?
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
    // initial load
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('fetch posts error', error)
      setPosts([])
      setLikeCount({})
      setCommentCount({})
      setLikedByMe({})
      setLoading(false)
      return
    }

    setPosts(data ?? [])
    setLoading(false)

    const ids = (data ?? []).map((p) => p.id)
    if (ids.length) {
      void fetchCounts(ids)
      void fetchLikedState(ids)
    } else {
      setLikeCount({})
      setCommentCount({})
      setLikedByMe({})
    }
  }

  async function fetchCounts(ids: number[]) {
    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabase.from('likes').select('post_id').in('post_id', ids),
      supabase.from('comments').select('post_id').in('post_id', ids),
    ])

    const likeMap: Record<number, number> = {}
    const cmtMap: Record<number, number> = {}

    for (const row of likes ?? []) {
      // @ts-ignore - row is { post_id: number }
      likeMap[row.post_id] = (likeMap[row.post_id] ?? 0) + 1
    }
    for (const row of comments ?? []) {
      // @ts-ignore - row is { post_id: number }
      cmtMap[row.post_id] = (cmtMap[row.post_id] ?? 0) + 1
    }

    setLikeCount(likeMap)
    setCommentCount(cmtMap)
  }

  async function fetchLikedState(ids: number[]) {
    if (!currentUserId) {
      setLikedByMe({})
      return
    }
    // which of these posts has a like by me?
    const { data, error } = await supabase
      .from('likes')
      .select('post_id, user_id')
      .eq('user_id', currentUserId)
      .in('post_id', ids)

    if (error) {
      console.error('liked state error', error)
      setLikedByMe({})
      return
    }

    const map: Record<number, boolean> = {}
    for (const row of data ?? []) {
      // @ts-ignore
      map[row.post_id] = true
    }
    setLikedByMe(map)
  }

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
      // unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)

      if (error) {
        console.error('unlike error', error)
        // revert
        setLikedByMe((m) => ({ ...m, [postId]: true }))
        setLikeCount((m) => ({ ...m, [postId]: (m[postId] ?? 0) + 1 }))
      }
    } else {
      // like
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: currentUserId })

      if (error) {
        console.error('like error', error)
        // revert
        setLikedByMe((m) => ({ ...m, [postId]: false }))
        setLikeCount((m) => ({ ...m, [postId]: Math.max(0, (m[postId] ?? 0) - 1) }))
      }
    }
  }

  async function handleDeleteConfirmed(id: number) {
    setBusyIds((s) => [...s, id])
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) {
      console.error('delete error', error)
      alert(error.message)
      setBusyIds((s) => s.filter((x) => x !== id))
      return
    }
    setConfirmId(null)
    setPosts((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
  }

  if (loading) return <div className="text-sm text-gray-500">Loading posts…</div>
  if (!posts || posts.length === 0) return <div className="text-sm text-gray-500">No posts yet.</div>

  return (
    <div className="space-y-4">
      {posts.map((p) => {
        const isOwner = currentUserId && p.author_id === currentUserId
        const deleting = busyIds.includes(p.id)
        const isConfirming = confirmId === p.id
        const liked = !!likedByMe[p.id]

        return (
          <article key={p.id} className="relative p-4 border rounded-xl bg-white shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-gray-800 whitespace-pre-wrap">{p.content}</p>

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

                  <span className="text-xs text-gray-600">
                    {(likeCount[p.id] ?? 0)} likes · {(commentCount[p.id] ?? 0)} comments
                  </span>
                </div>

                <div className="mt-1 text-[11px] text-gray-400">
                  {new Date(p.created_at).toLocaleString()}
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

            {/* Themed confirmation popover */}
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
                    disabled={deleting}
                    className="px-3 py-1 rounded text-white text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50 transition"
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
  )
}
