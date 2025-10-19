
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ConversationsSidebar from '@/components/ConversationsSidebar'
import MarkReadEffect from '@/components/MarkReadEffect'
import { supabase } from '@/lib/supabaseClient'

type Conversation = {
  id: number
  user_a: string
  user_b: string
  last_message_at: string
}
type Message = {
  id: number
  conversation_id: number
  sender_id: string
  body: string | null
  image_url: string | null
  created_at: string
}
type Profile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export default function DMPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const convoId = Number(params.id)

  const [me, setMe] = useState<string | null>(null)
  const [convos, setConvos] = useState<Conversation[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  // composer
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const sendingRef = useRef(false)
  const scroller = useRef<HTMLDivElement>(null)

  // who am I talking to?
  const otherId = useMemo(() => {
    const cv = convos.find(c => c.id === convoId)
    if (!cv || !me) return null
    return cv.user_a === me ? cv.user_b : cv.user_a
  }, [convos, convoId, me])

  const other = otherId ? profiles[otherId] : undefined
  const otherName = other?.full_name || other?.username || 'User'

  // load auth user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  // load conversations & cache profiles
  useEffect(() => {
    if (!me) return
    ;(async () => {
      const { data: c } = await supabase
        .from('conversations')
        .select('*')
        .or(`user_a.eq.${me},user_b.eq.${me}`)
        .order('last_message_at', { ascending: false })
        .limit(50)
      const list = (c ?? []) as Conversation[]
      setConvos(list)

      const ids = Array.from(new Set(list.map(cv => (cv.user_a === me ? cv.user_b : cv.user_a))))
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', ids)
        const map: Record<string, Profile> = {}
        ;(profs ?? []).forEach(p => (map[p.id] = p as Profile))
        setProfiles(prev => ({ ...prev, ...map }))
      }
    })()
  }, [me])

  // load messages
  useEffect(() => {
    if (!convoId) return
    setLoading(true)
    ;(async () => {
      const { data: m } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true })
        .limit(500)
      setMessages((m ?? []) as Message[])
      setLoading(false)
      requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }))
    })()
  }, [convoId])

  // realtime new messages for this convo
  useEffect(() => {
    if (!convoId) return
    const ch = supabase
      .channel(`dm-${convoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convoId}` }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
        requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current!.scrollHeight, behavior: 'smooth' }))
      })
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [convoId])

  // cleanup preview URL
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function send() {
    if (sendingRef.current || !me) return
    const body = text.trim()
    if (!body && !file) return

    sendingRef.current = true
    let imageUrl: string | null = null

    if (file) {
      const path = `${me}/dm/${convoId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const { error: upErr } = await supabase.storage.from('images').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })
      if (upErr) {
        sendingRef.current = false
        alert(upErr.message)
        return
      }
      const { data } = supabase.storage.from('images').getPublicUrl(path)
      imageUrl = data.publicUrl
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: convoId,
      sender_id: me!,
      body: body || null,
      image_url: imageUrl,
    })
    if (error) alert(error.message)

    setText('')
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    sendingRef.current = false
  }

  return (
    <main className="max-w-5xl mx-auto p-4">
      {/* Fixed-height wrapper */}
      <div className="h-[calc(100vh-180px)] grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
        {/* Left: sidebar (unread badges) */}
        <div className="h-full rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <ConversationsSidebar
            selectedId={convoId}
            onSelect={(id) => router.push(`/messages/${id}`)}
            height={680}
            className="h-full"
          />
        </div>

        {/* Right: thread card */}
        <section className="h-full rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col">
          {/* Auto mark this convo as read */}
          <MarkReadEffect conversationId={convoId} />

          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
            <img src={other?.avatar_url || '/favicon.ico'} alt="" className="h-9 w-9 rounded-full object-cover" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900">{otherName}</div>
              <div className="text-[11px] text-gray-500">Direct message</div>
            </div>
          </div>

          {/* Messages (scrolling area) */}
          <div
            ref={scroller}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white via-white to-purple-50/30"
          >
            {loading ? (
              <div className="text-sm text-gray-500">Loading conversation…</div>
            ) : messages.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-8">Start of conversation</div>
            ) : (
              messages.map(m => {
                const mine = m.sender_id === me
                return (
                  <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                    <div className="max-w-[75%]">
                      {m.image_url && (
                        <img
                          src={m.image_url}
                          alt=""
                          className={['rounded-2xl border object-cover', mine ? 'ml-auto' : ''].join(' ')}
                        />
                      )}
                      {m.body && (
                        <div
                          className={[
                            'mt-1 rounded-2xl px-3 py-2 text-sm shadow-sm',
                            mine
                              ? 'text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
                              : 'bg-gray-100 text-gray-800',
                          ].join(' ')}
                        >
                          {m.body}
                        </div>
                      )}
                      <div className={['mt-1 text-[11px] text-gray-500', mine ? 'text-right' : ''].join(' ')}>
                        {new Date(m.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Composer (fixed) */}
          <div className="border-t px-3 py-3 shrink-0">
            {preview && (
              <div className="mb-2 flex items-center gap-2">
                <img src={preview} alt="" className="h-16 w-16 rounded-lg border object-cover" />
                <button
                  onClick={() => {
                    setFile(null)
                    if (preview) URL.revokeObjectURL(preview)
                    setPreview(null)
                  }}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs px-3 py-2 rounded-full border hover:bg-gray-50 cursor-pointer">
                <input type="file" className="hidden" accept="image/*" onChange={onPick} />
                + Image
              </label>

              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' && !e.shiftKey ? (e.preventDefault(), send()) : null)}
                placeholder="Write a message…"
                className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              <button
                onClick={send}
                disabled={!text.trim() && !file}
                className="px-4 py-2 rounded-full text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 disabled:opacity-50 hover:opacity-90"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
