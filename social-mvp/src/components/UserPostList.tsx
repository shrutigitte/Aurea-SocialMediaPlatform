'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Post = {
  id: number
  author_id: string
  content: string | null
  image_url: string | null
  created_at: string
}

export default function UserPostList({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
    // realtime for this author's posts
    const ch = supabase.channel(`profile-posts-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `author_id=eq.${userId}` },
        (payload) => setPosts((prev) => [payload.new as Post, ...(prev ?? [])])
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts', filter: `author_id=eq.${userId}` },
        (payload) => {
          const oldRow = payload.old as { id: number }
          setPosts((prev) => prev ? prev.filter(p => p.id !== oldRow.id) : prev)
        }
      )
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function fetchPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('profile posts error', error)
      setPosts([])
    } else {
      setPosts((data ?? []) as Post[])
    }
    setLoading(false)
  }

  if (loading) return <div className="text-sm text-gray-500">Loading posts…</div>
  if (!posts || posts.length === 0) return <div className="text-sm text-gray-500">No posts yet.</div>

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <article key={p.id} className="p-4 border rounded-xl bg-white shadow">
          <div className="text-[11px] text-gray-400">{new Date(p.created_at).toLocaleString()}</div>
          {p.content && <p className="mt-2 text-gray-800 whitespace-pre-wrap">{p.content}</p>}
          {p.image_url && (
            <div className="mt-3">
              <img src={p.image_url} alt="Post image" className="w-full max-h-[520px] object-cover rounded-xl border" />
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
