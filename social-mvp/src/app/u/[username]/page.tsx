
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from '@/components/ProfileAvatar'
import UserPostList from '@/components/UserPostList'
import FollowButton from '@/components/FollowButton'

type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

function MessageUserButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter()
  const [sending, setSending] = useState(false)

  const onClick = async () => {
    if (sending) return
    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      const { data, error } = await supabase.rpc('get_or_create_dm', { other_user: targetUserId })
      if (error) {
        alert(error.message)
        return
      }
      router.push(`/messages/${data}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={sending}
      className="ml-2 px-3 py-1.5 rounded-full text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50"
      title="Send a direct message"
    >
      {sending ? 'Opening…' : 'Message'}
    </button>
  )
}

export default function UsernameProfilePage({ params }: { params: { username: string } }) {
  const uname = decodeURIComponent(params.username)
  const [me, setMe] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .eq('username', uname) // usernames are stored lowercased by your schema
        .maybeSingle()
      if (error) console.error(error)
      setProfile((data as any) ?? null)
      setLoading(false)
    })()
  }, [uname])

  if (loading) {
    return <main className="max-w-2xl mx-auto p-4 text-sm text-gray-500">Loading profile…</main>
  }

  if (!profile) {
    return (
      <main className="max-w-2xl mx-auto p-4">
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-700">
          User @{uname} not found.{' '}
          <Link className="text-purple-600 underline" href="/explore">
            Explore users
          </Link>
        </div>
      </main>
    )
  }

  const isMe = me === profile.id

  return (
    <main className="max-w-2xl mx-auto p-4">
      <header className="p-4 border rounded-xl bg-white shadow flex items-start gap-4">
        <ProfileAvatar profile={profile} size={56} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {profile.full_name || profile.username || 'User'}
              </h1>
              <div className="text-sm text-gray-500">@{profile.username}</div>
            </div>
            <div className="flex items-center">
              {isMe ? (
                <Link
                  href="/profile/edit"
                  className="text-xs px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50"
                >
                  Edit profile
                </Link>
              ) : (
                <>
                  <FollowButton targetUserId={profile.id} />
                  <MessageUserButton targetUserId={profile.id} />
                </>
              )}
            </div>
          </div>
          {profile.bio && <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</p>}
        </div>
      </header>

      {/* Posts by this user */}
      <section className="mt-4">
        <UserPostList userId={profile.id} />
      </section>
    </main>
  )
}
