'use client'

import { useEffect, useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabaseClient'

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false)

  // After sign-in, go to your app (feed)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN') window.location.href = '/feed'
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  return (
    <div className="min-h-[80vh] flex items-center">
      <div className="max-w-5xl mx-auto w-full px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: Hero */}
          <section className="text-center md:text-left">
            <h1 className="text-5xl  font-extrabold tracking-tight">
              Welcome to{' '}
              <span className="bg-gradient-to-r tinos-regular from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                Aurea
              </span>
            </h1>
            <p className="mt-4 text-lg tinos-regular text-gray-700">
              Be part of the <span className="text-purple-600 font-semibold">Aurean age</span> — share moments, connect, and grow.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <button
                onClick={() => setShowLogin(true)}
                className="px-5 py-2 rounded text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition"
              >
                Get Started
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="px-5 py-2 rounded bg-gradient-to-r from-purple-500  to-orange-500 text-white hover:bg-purple-700 transition"
              >
                Login
              </button>
              {showLogin && (
                <button
                  onClick={() => setShowLogin(false)}
                  className="px-4 py-2 rounded border border-gray-200 hover:bg-gray-50 transition"
                >
                  Hide
                </button>
              )}
            </div>
          </section>

          {/* Right: Inline login panel (shows on click) */}
          <section
            className={
              'transition-all duration-300 ' +
              (showLogin ? 'opacity-100 translate-x-0' : 'opacity-0 pointer-events-none translate-x-2')
            }
          >
            <div className="bg-white rounded-2xl shadow p-5 md:p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-3">Sign in to Aurea</h2>
              {/* <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google']} /> */}
              <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google']} />

            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

