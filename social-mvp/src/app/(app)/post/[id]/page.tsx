'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from '@/components/ProfileAvatar'
import CommentBox from '@/components/CommentBox'
import CommentList from '@/components/CommentList'
import FollowButton from '@/components/FollowButton'

type Post = { id: number; author_id: string; content: string | null; image_url: string | null; created_at: string }
type Profile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const postId = Number(params.id)
  const [me, setMe] = useState<string | null>(null)
  const [post, setPost] = useState<Post | null>(null)
  const [author, setAuthor] = useState<Profile | null>(null)
  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [likedByMe, setLikedByMe] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const isOwner = useMemo(() => me && post && me === post.author_id, [me, post])
  const authorLink =author?.username ? `/u/${encodeURIComponent(author.username)}` : `/profile/${post.author_id}`

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
    fetchAll()
    const ch = supabase.channel(`post-${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
        (p) => { setLikeCount((c) => c + 1); if ((p.new as any).user_id === me) setLikedByMe(true) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
        (p) => { setLikeCount((c) => Math.max(0, c - 1)); if ((p.old as any).user_id === me) setLikedByMe(false) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => setCommentCount((c) => c + 1))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => setCommentCount((c) => Math.max(0, c - 1)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
        () => setPost(null))
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, me])

  async function fetchAll() {
    const { data: p } = await supabase.from('posts').select('*').eq('id', postId).maybeSingle()
    if (!p) { setPost(null); return }
    setPost(p as Post)
    const { data: a } = await supabase.from('profiles')
      .select('id, username, full_name, avatar_url').eq('id', (p as Post).author_id).single()
    setAuthor(a as Profile)

    const [{ count: lc }, { count: cc }] = await Promise.all([
      supabase.from('likes').select('*', { head: true, count: 'exact' }).eq('post_id', postId),
      supabase.from('comments').select('*', { head: true, count: 'exact' }).eq('post_id', postId),
    ])
    setLikeCount(lc ?? 0); setCommentCount(cc ?? 0)

    const { data: mine } = await supabase.from('likes')
      .select('post_id').eq('post_id', postId).eq('user_id', me ?? '').maybeSingle()
    setLikedByMe(!!mine)
  }

  async function toggleLike() {
    if (!me || !post) return alert('Please sign in to like.')
    const curr = likedByMe
    setLikedByMe(!curr); setLikeCount((c) => Math.max(0, c + (curr ? -1 : 1)))
    if (curr) {
      const { error } = await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', me)
      if (error) { setLikedByMe(true); setLikeCount((c) => c + 1) }
    } else {
      const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: me })
      if (error) { setLikedByMe(false); setLikeCount((c) => Math.max(0, c - 1)) }
    }
  }

  async function deletePost() {
    if (!post) return
    setBusyDelete(true)
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    setBusyDelete(false)
    if (error) return alert(error.message)
    setPost(null)
  }

  function copyLink() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => alert('Link copied!'), () => prompt('Copy link:', url))
  }

  if (post === null) {
    return (
      <main className="max-w-2xl mx-auto p-4">
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
          Post not found or was deleted. <Link className="text-purple-600 underline" href="/feed">Go back</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      <article className="p-4 border rounded-xl bg-white shadow">
        <div className="flex items-start justify-between gap-3">
          {/* <Link href={`/profile/${post.author_id}`} className="flex items-start gap-3 group">
            <ProfileAvatar profile={author as any} size={40} />
            <div className="leading-tight">
              <div className="text-sm font-medium text-gray-900 group-hover:underline">
                {author?.full_name || author?.username || 'User'}
              </div>
              <div className="text-[11px] text-gray-400">{new Date(post.created_at).toLocaleString()}</div>
            </div>
          </Link> */}
          

<Link href={authorLink} className="flex items-start gap-3 group">
  <ProfileAvatar profile={author as any} size={40} />
  <div className="leading-tight">
    <div className="text-sm font-medium text-gray-900 group-hover:underline">
      {author?.full_name || author?.username || 'User'}
    </div>
    <div className="text-[11px] text-gray-400">
      {new Date(post.created_at).toLocaleString()}
    </div>
  </div>
</Link>

          <div className="flex items-center gap-2">
            {author && me !== author.id && <FollowButton targetUserId={author.id} />}
            {me === post.author_id && (
              <button onClick={() => setConfirm((s) => !s)} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">
                Delete
              </button>
            )}
          </div>
        </div>

        {post.content && <p className="mt-3 text-gray-800 whitespace-pre-wrap">{post.content}</p>}
        {post.image_url && <div className="mt-3"><img src={post.image_url} alt="Post image" className="w-full max-h-[520px] object-cover rounded-xl border" /></div>}

        <div className="mt-3 flex items-center flex-wrap gap-2">
          <button onClick={toggleLike} className={likedByMe
              ? 'text-xs px-3 py-1 rounded text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90'
              : 'text-xs px-3 py-1 rounded border border-purple-200 text-purple-700 hover:bg-purple-50'}>
            {likedByMe ? '♥ Liked' : '♡ Like'}
          </button>
          <button onClick={copyLink} className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50">Copy link</button>
          <span className="text-xs text-gray-600">{likeCount} likes · {commentCount} comments</span>
        </div>

        {me === post.author_id && confirm && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow p-3">
            <p className="text-sm text-gray-800">Delete this post?</p>
            <p className="text-xs text-gray-500">This action can’t be undone.</p>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setConfirm(false)} className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={deletePost} disabled={busyDelete} className="px-3 py-1 rounded text-white text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50">
                {busyDelete ? 'Deleting…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </article>

      <section className="mt-4">
        <CommentBox postId={post.id} onCommentAdded={() => setCommentCount((c) => c + 1)} />
        <CommentList postId={post.id} />
      </section>
    </main>
  )
}
