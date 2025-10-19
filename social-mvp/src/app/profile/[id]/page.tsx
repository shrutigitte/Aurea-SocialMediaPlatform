// 'use client'

// import { useEffect, useState } from 'react'
// import { supabase } from '@/lib/supabaseClient'
// import ProfileEditor from '@/components/ProfileEditor'
// import UserPostList from '@/components/UserPostList'
// import FollowButton from '@/components/FollowButton'

// type Profile = {
//   id: string
//   username: string | null
//   full_name: string | null
//   avatar_url: string | null
//   bio: string | null
// }

// export default function ProfilePage({ params }: { params: { id: string } }) {
//   const userId = params.id
//   const [profile, setProfile] = useState<Profile | null>(null)
//   const [me, setMe] = useState<string | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [followers, setFollowers] = useState<number>(0)
//   const [following, setFollowing] = useState<number>(0)
//   const isMe = me && me === userId

//   useEffect(() => {
//     supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
//     fetchProfile()
//     fetchFollowCounts()

//     // realtime: profile updates
//     const chProf = supabase.channel(`profile-${userId}`)
//       .on('postgres_changes',
//         { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
//         (payload) => setProfile(payload.new as Profile)
//       )
//     chProf.subscribe()

//     // realtime: follow counts
//     const chFollows = supabase.channel(`follows-${userId}`)
//       .on('postgres_changes',
//         { event: '*', schema: 'public', table: 'follows', filter: `following=eq.${userId}` },
//         () => fetchFollowCounts()
//       )
//       .on('postgres_changes',
//         { event: '*', schema: 'public', table: 'follows', filter: `follower=eq.${userId}` },
//         () => fetchFollowCounts()
//       )
//     chFollows.subscribe()

//     return () => {
//       supabase.removeChannel(chProf)
//       supabase.removeChannel(chFollows)
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [userId])

//   async function fetchProfile() {
//     setLoading(true)
//     const { data, error } = await supabase
//       .from('profiles')
//       .select('*')
//       .eq('id', userId)
//       .single()
//     if (error) {
//       console.error('profile fetch error', error)
//       setProfile(null)
//     } else {
//       setProfile(data as Profile)
//     }
//     setLoading(false)
//   }

//   async function fetchFollowCounts() {
//     const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
//       supabase.from('follows').select('*', { head: true, count: 'exact' }).eq('following', userId),
//       supabase.from('follows').select('*', { head: true, count: 'exact' }).eq('follower', userId),
//     ])
//     setFollowers(followersCount ?? 0)
//     setFollowing(followingCount ?? 0)
//   }

//   if (loading) return <div className="max-w-2xl mx-auto p-4 text-sm text-gray-500">Loading profile…</div>
//   if (!profile) return <div className="max-w-2xl mx-auto p-4 text-sm text-red-600">Profile not found.</div>

//   return (
//     <main className="max-w-2xl mx-auto p-4">
//       {/* Header card */}
//       <section className="p-4 border rounded-xl bg-white shadow">
//         <div className="flex items-start justify-between gap-4">
//           <div className="flex items-start gap-4">
//             <div className="w-20 h-20 rounded-full overflow-hidden border bg-gray-100">
//               {profile.avatar_url ? (
//                 <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
//               ) : (
//                 <div className="w-full h-full grid place-items-center text-xs text-gray-400">No avatar</div>
//               )}
//             </div>

//             <div className="flex-1">
//               <h1 className="text-xl font-semibold text-gray-900">
//                 {profile.full_name || 'Unnamed'}
//               </h1>
//               {profile.username && (
//                 <div className="text-sm text-gray-500">@{profile.username}</div>
//               )}
//               {profile.bio && (
//                 <p className="mt-2 text-gray-800 whitespace-pre-wrap">{profile.bio}</p>
//               )}

//               <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
//                 <span><strong>{followers}</strong> followers</span>
//                 <span><strong>{following}</strong> following</span>
//               </div>
//             </div>
//           </div>

//           {!isMe && <FollowButton targetUserId={userId} />}
//         </div>
//       </section>

//       {/* Editor (only for me) */}
//       {isMe && (
//         <section className="mt-4">
//           <ProfileEditor
//             userId={userId}
//             initial={profile}
//             onSaved={(p) => setProfile(p)}
//           />
//         </section>
//       )}

//       {/* Posts */}
//       <section className="mt-6">
//         <h2 className="text-lg font-semibold text-gray-900 mb-3">Posts</h2>
//         <UserPostList userId={userId} />
//       </section>
//     </main>
//   )
// }
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from '@/components/ProfileAvatar'
import CommentBox from '@/components/CommentBox'
import CommentList from '@/components/CommentList'
import FollowButton from '@/components/FollowButton'

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

  // bootstrap
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
    fetchAll()
    // realtime: likes/comments on this post
    const ch = supabase.channel(`post-${postId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
        (payload) => {
          setLikeCount((c) => c + 1)
          const row = payload.new as any
          if (row.user_id === me) setLikedByMe(true)
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
        (payload) => {
          setLikeCount((c) => Math.max(0, c - 1))
          const row = payload.old as any
          if (row.user_id === me) setLikedByMe(false)
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => setCommentCount((c) => c + 1)
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => setCommentCount((c) => Math.max(0, c - 1))
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
        () => setPost(null)
      )
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, me])

  async function fetchAll() {
    // post
    const { data: p, error: perr } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()
    if (perr || !p) {
      setPost(null)
      return
    }
    setPost(p as Post)

    // author
    const { data: a } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', (p as Post).author_id)
      .single()
    setAuthor(a as Profile)

    // counts
    const [{ count: lc }, { count: cc }] = await Promise.all([
      supabase.from('likes').select('*', { head: true, count: 'exact' }).eq('post_id', postId),
      supabase.from('comments').select('*', { head: true, count: 'exact' }).eq('post_id', postId),
    ])
    setLikeCount(lc ?? 0)
    setCommentCount(cc ?? 0)

    // liked by me
    const { data: mine } = await supabase
      .from('likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', me ?? '')
      .maybeSingle()
    setLikedByMe(!!mine)
  }

  async function toggleLike() {
    if (!me) return alert('Please sign in to like.')
    if (!post) return
    const currently = likedByMe
    setLikedByMe(!currently)
    setLikeCount((c) => Math.max(0, c + (currently ? -1 : 1)))

    if (currently) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', me)
      if (error) {
        setLikedByMe(true)
        setLikeCount((c) => c + 1)
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: me })
      if (error) {
        setLikedByMe(false)
        setLikeCount((c) => Math.max(0, c - 1))
      }
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
    navigator.clipboard.writeText(url).then(
      () => alert('Link copied!'),
      () => prompt('Copy link:', url) // fallback
    )
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
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <Link href={`/profile/${post.author_id}`} className="flex items-start gap-3 group">
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
            {(!isOwner && author) && <FollowButton targetUserId={author.id} />}
            {isOwner && (
              <button
                onClick={() => setConfirm((s) => !s)}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {post.content && <p className="mt-3 text-gray-800 whitespace-pre-wrap">{post.content}</p>}
        {post.image_url && (
          <div className="mt-3">
            <img
              src={post.image_url}
              alt="Post image"
              className="w-full max-h-[520px] object-cover rounded-xl border"
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center flex-wrap gap-2">
          <button
            onClick={toggleLike}
            className={
              likedByMe
                ? 'text-xs px-3 py-1 rounded text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition'
                : 'text-xs px-3 py-1 rounded border border-purple-200 text-purple-700 hover:bg-purple-50 transition'
            }
          >
            {likedByMe ? '♥ Liked' : '♡ Like'}
          </button>

          <button
            onClick={copyLink}
            className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50"
          >
            Copy link
          </button>

          <span className="text-xs text-gray-600">
            {likeCount} likes · {commentCount} comments
          </span>
        </div>

        {/* Delete confirm */}
        {isOwner && confirm && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow p-3">
            <p className="text-sm text-gray-800">Delete this post?</p>
            <p className="text-xs text-gray-500">This action can’t be undone.</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setConfirm(false)}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={deletePost}
                disabled={busyDelete}
                className="px-3 py-1 rounded text-white text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50"
              >
                {busyDelete ? 'Deleting…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </article>

      {/* Comments thread */}
      <section className="mt-4">
        <CommentBox
          postId={post.id}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
        />
        <CommentList postId={post.id} />
      </section>
    </main>
  )
}
