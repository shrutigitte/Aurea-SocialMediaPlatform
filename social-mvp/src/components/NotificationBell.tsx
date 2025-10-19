
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function NotificationBell() {
  const pathname = usePathname()
  const [uid, setUid] = useState<string | null>(null)
  const [unread, setUnread] = useState<number>(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!uid) return
    const refresh = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('read', false)
      setUnread(count ?? 0)
    }
    refresh()

    const ch = supabase
      .channel('notif-bell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        () => refresh()
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [uid])

  // Visiting /notifications clears the badge visually
  useEffect(() => {
    if (pathname === '/notifications') setUnread(0)
  }, [pathname])

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
      aria-label="Notifications"
    >
      {/* Bell icon (clean inline SVG) */}
      <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-700" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.172V11a6 6 0 1 0-12 0v3.172a2 2 0 0 1-.6 1.428L4 17h5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 17a3 3 0 0 0 6 0" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {unread > 0 && (
        <span
          aria-label={`${unread} unread notifications`}
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] leading-[18px] text-white text-center bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 shadow"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
