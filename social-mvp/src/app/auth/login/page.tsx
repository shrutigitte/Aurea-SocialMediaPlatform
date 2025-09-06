'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN') window.location.href = '/'
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  return (
    <div className="max-w-md mx-auto mt-10 p-4">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google']}   // I have added this as optional; works even if you didn’t enable Google
        redirectTo="http://localhost:3000"
      />
    </div>
  )
}
