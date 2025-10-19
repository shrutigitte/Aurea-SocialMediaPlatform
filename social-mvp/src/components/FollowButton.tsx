'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const [me, setMe] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const uid = data.user?.id ?? null
      setMe(uid)
      if (uid && targetUserId && uid !== targetUserId) {
        checkIsFollowing(uid, targetUserId)
      }
    })

    // realtime: reflect follow/unfollow from any tab
    const ch = supabase.channel(`follow-${targetUserId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'follows', filter: `following=eq.${targetUserId}` },
        (payload) => {
          const row = payload.new as { follower: string, following: string }
          if (row.follower === me) setIsFollowing(true)
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'follows', filter: `following=eq.${targetUserId}` },
        (payload) => {
          const row = payload.old as { follower: string, following: string }
          if (row.follower === me) setIsFollowing(false)
        }
      )
    ch.subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId])

  async function checkIsFollowing(follower: string, following: string) {
    const { data } = await supabase
      .from('follows')
      .select('follower')
      .eq('follower', follower)
      .eq('following', following)
      .maybeSingle()
    setIsFollowing(!!data)
  }

  async function toggle() {
    if (!me) {
      alert('Please sign in to follow.')
      return
    }
    if (me === targetUserId) return

    setLoading(true)
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower', me)
          .eq('following', targetUserId)
        if (error) throw error
        setIsFollowing(false)
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower: me, following: targetUserId })
        if (error) throw error
        setIsFollowing(true)
      }
    } catch (e: any) {
      alert(e.message ?? 'Failed to update follow')
    } finally {
      setLoading(false)
    }
  }

  if (!me || me === targetUserId) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={
        isFollowing
          ? 'text-xs px-3 py-1 rounded border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50'
          : 'text-xs px-3 py-1 rounded text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50'
      }
      title={isFollowing ? 'Unfollow' : 'Follow'}
    >
      {loading ? 'Please wait…' : isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
