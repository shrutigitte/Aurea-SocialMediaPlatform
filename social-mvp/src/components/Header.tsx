'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import NotificationBell from '@/components/NotificationBell'

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [dmUnread, setDmUnread] = useState(0)

  // --- auth + username ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null
      setUser(u)
      if (u) void fetchUsername(u.id)
      else setUsername(null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null
      setUser(u as any)
      if (u) void fetchUsername(u.id)
      else setUsername(null)
      void loadDmUnread()
    })
    return () => { sub.subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchUsername(uid: string) {
    const { data } = await supabase.from('profiles').select('username').eq('id', uid).maybeSingle()
    setUsername((data as any)?.username ?? null)
  }

  const profileHref =
    user ? (username ? `/u/${encodeURIComponent(username)}` : `/profile/${user.id}`) : '/auth/login'

  const signOut = async () => {
    await supabase.auth.signOut()
    location.href = '/auth/login'
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    router.push(`/explore?q=${encodeURIComponent(term)}&t=users`)
    setQ('')
  }

  // --- DM unread badge ---
  async function loadDmUnread() {
    const { data, error } = await supabase.rpc('conversations_overview')
    if (error) {
      console.error('unread rpc error', error)
      setDmUnread(0)
      return
    }
    const total = (data as any[]).reduce((sum, r) => sum + (r.unread ?? 0), 0)
    setDmUnread(total)
  }

  useEffect(() => {
    void loadDmUnread()
    const ch = supabase
      .channel('header-dm-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void loadDmUnread()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reads' }, () => {
        void loadDmUnread()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return (
    <header className="bg-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-2xl mx-auto p-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link
          href="/"
          className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent"
          aria-label="Aurea home"
        >
          Aurea
        </Link>

        {/* Search */}
        <form onSubmit={onSearch} className="hidden sm:flex items-center gap-2 flex-1 mx-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Aurea…"
            className="flex-1 border rounded-full px-3 py-1.5 text-sm border-purple-500 placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white"
          >
            Go
          </button>
        </form>

        {/* Nav */}
        <nav className="flex items-center gap-3">
          <Link
            href="/explore"
            className="text-sm px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50"
          >
            Explore
          </Link>

          {/* Messages icon with unread badge */}
          <Link
            href="/messages"
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50"
            aria-label="Messages"
            title="Messages"
          >
            {/* chat-bubble icon (inline SVG) */}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <defs>
                <linearGradient id="aurea-chat" x1="0" x2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>
              <path
                fill="url(#aurea-chat)"
                d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v6A3.5 3.5 0 0 1 16.5 15H12l-3.6 2.7c-.82.62-1.9-.17-1.6-1.1L7.4 15H7.5A3.5 3.5 0 0 1 4 11.5v-6Z"
              />
            </svg>

            {dmUnread > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow">
                {dmUnread}
              </span>
            )}
            <span className="sr-only">Messages ({dmUnread})</span>
          </Link>

          {/* Notifications bell (your existing component) */}
          <NotificationBell />

          {user ? (
            <>
              <Link href={profileHref} className="text-sm text-purple-700 hover:underline">
                Profile
              </Link>
              <button
                onClick={signOut}
                className="text-sm px-3 py-1 rounded bg-purple-500 text-white hover:bg-purple-600"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm px-3 py-1 rounded bg-purple-500 text-white hover:bg-purple-600"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

