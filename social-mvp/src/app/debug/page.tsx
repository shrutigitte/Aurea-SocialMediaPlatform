'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DebugPage() {
  const [envOk, setEnvOk] = useState<boolean>(true)
  const [envMsg, setEnvMsg] = useState<string>('Checking…')
  const [userMsg, setUserMsg] = useState<string>('Checking auth…')
  const [postsMsg, setPostsMsg] = useState<string>('Checking posts…')

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      setEnvOk(false)
      setEnvMsg('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    } else {
      setEnvOk(true)
      setEnvMsg(`URL ok (${url.slice(0, 30)}…), KEY ok (${key.slice(0, 8)}… )`)
    }

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) setUserMsg(`auth error: ${error.message}`)
      else setUserMsg(data.user ? `signed in as ${data.user.email ?? data.user.id}` : 'not signed in')
    })

    supabase
      .from('posts')
      .select('id', { head: true, count: 'exact' })
      .then(({ error, count }) => {
        if (error) setPostsMsg(`posts error: ${error.message}`)
        else setPostsMsg(`posts count ok: ${count}`)
      })
  }, [])

  return (
    <div className="max-w-xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-bold">Aurea Debug</h1>

      <div className={`p-3 rounded border ${envOk ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <div className="font-semibold">Env</div>
        <div className="text-sm">{envMsg}</div>
      </div>

      <div className="p-3 rounded border border-gray-200">
        <div className="font-semibold">Auth</div>
        <div className="text-sm">{userMsg}</div>
      </div>

      <div className="p-3 rounded border border-gray-200">
        <div className="font-semibold">Posts</div>
        <div className="text-sm">{postsMsg}</div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        If Env is missing: update <code>.env.local</code> from Supabase Settings → API and restart <code>npm run dev</code>.
      </p>
    </div>
  )
}
