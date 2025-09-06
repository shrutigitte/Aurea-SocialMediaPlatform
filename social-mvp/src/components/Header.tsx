'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

export function Header() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data }) => setUser(data.user))
    })
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    return () => { sub.data.subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    location.href = '/auth/login'
  }

  return (
    <header className="bg-white shadow-md"> 
      <div className="max-w-2xl mx-auto p-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl fleur-de-leah-regular tracking-wide bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent"
        >
          Aurea
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href={`/profile/${user.id}`}
                className="text-sm text-gray-700 hover:underline"
              >
                Profile
              </Link>
              <button
                onClick={signOut}
                className="text-sm px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm px-3 py-1 rounded font-bold text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}