'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProfileAvatar from '@/components/ProfileAvatar'

type Profile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }
type Convo = { id: number; user_a: string; user_b: string }
type Msg = {
  id: number
  conversation_id: number
  sender_id: string
  body: string | null
  image_url: string | null
  created_at: string
}

const PAGE = 40

export default function ChatWindow({ conversationId }: { conversationId: number }) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [me, setMe] = useState<string | null>(null)
  const [convo, setConvo] = useState<Convo | null>(null)
  const [other, setOther] = useState<Profile | null>(null)

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [olderCursor, setOlderCursor] = useState<{ ts: string; id: number } | null>(null)
  const [hasOlder, setHasOlder] = useState(true)

  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const otherId = useMemo(() => {
    if (!me || !convo) return null
    return convo.user_a === me ? convo.user_b : convo.user_a
  }, [me, convo])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  // load conversation + other profile + first page messages
  useEffect(() => {
    if (!conversationId || !me) return
    const load = async () => {
      setLoading(true)
      const { data: c } = await supabase
        .from('conversations')
        .select('id, user_a, user_b')
        .eq('id', conversationId)
        .maybeSingle()
      if (!c) { setLoading(false); return }
      setConvo(c as Convo)

      const oid = (c as Convo).user_a === me ? (c as Convo).user_b : (c as Convo).user_a
      const { data: p } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', oid)
        .maybeSingle()
      setOther((p ?? null) as Profile | null)

      const { data: m } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, image_url, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(PAGE)
      const list = (m ?? []) as Msg[]
      setMsgs(list)
      setHasOlder((m ?? []).length === PAGE)
      if ((m ?? []).length) {
        const first = list[0]
        setOlderCursor({ ts: first.created_at, id: first.id })
      }
      setLoading(false)
      // mark read
      if (list.length) {
        await supabase.from('message_reads').upsert({
          conversation_id: conversationId,
          user_id: me,
          last_read_message_id: list[list.length - 1].id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'conversation_id,user_id' })
      }
      scrollToBottom(true)
    }
    load()

    const ch = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const m = payload.new as unknown as Msg
          setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
          if (m.sender_id === me) scrollToBottom(true)
          else scrollToBottom(false)
          // update read pointer if message is mine
          if (m.sender_id === me) {
            await supabase.from('message_reads').upsert({
              conversation_id: conversationId, user_id: me, last_read_message_id: m.id, updated_at: new Date().toISOString()
            }, { onConflict: 'conversation_id,user_id' })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, me])

  const loadOlder = useCallback(async () => {
    if (!olderCursor) return
    const or = `created_at.lt.${olderCursor.ts},and(created_at.eq.${olderCursor.ts},id.lt.${olderCursor.id})`
    const { data } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, image_url, created_at')
      .eq('conversation_id', conversationId)
      .or(or)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PAGE)
    const batch = (data ?? []) as Msg[]
    if (!batch.length) { setHasOlder(false); return }
    setMsgs(prev => [...batch, ...prev])
    const first = batch[0]
    setOlderCursor({ ts: first.created_at, id: first.id })
    setHasOlder(batch.length === PAGE)
  }, [conversationId, olderCursor])

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return
    if (f.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function send() {
    if (!me) return
    if (!text.trim() && !file) return
    setSending(true)

    let imageUrl: string | null = null
    if (file) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${me}/dm/${conversationId}/${Date.now()}.${ext}`
      const up = await supabase.storage.from('images').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type,
      })
      if (up.error) { alert(up.error.message); setSending(false); return }
      const { data } = supabase.storage.from('images').getPublicUrl(path)
      imageUrl = data.publicUrl
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: me,
      body: text.trim() ? text.trim() : null,
      image_url: imageUrl,
    })
    if (error) alert(error.message)

    setText('')
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setSending(false)
    scrollToBottom(true)
  }

  function scrollToBottom(force: boolean) {
    if (!bottomRef.current) return
    if (force) bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    else {
      // If user is already near bottom, keep them pinned
      const el = document.scrollingElement || document.documentElement
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 300
      if (near) bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  if (!me) return <div className="flex-1 p-4">Sign in to chat.</div>
  if (loading) return <div className="flex-1 p-4 text-sm text-gray-500">Loading…</div>
  if (!convo || !other) return <div className="flex-1 p-4 text-sm text-gray-500">Conversation not found.</div>

  const title = other.full_name || other.username || 'Chat'

  return (
    <section className="flex-1 flex flex-col min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-white">
        <ProfileAvatar profile={other as any} size={36} />
        <div>
          <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
          <div className="text-[11px] text-gray-400">Direct message</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        <div className="max-w-2xl mx-auto px-3 py-3">
          {/* Load older */}
          <div className="flex justify-center mb-2">
            {hasOlder ? (
              <button onClick={loadOlder} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50">
                Load earlier
              </button>
            ) : (
              <span className="text-[11px] text-gray-400">Start of conversation</span>
            )}
          </div>

          {msgs.map(m => {
            const mine = m.sender_id === me
            return (
              <div key={m.id} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-2.5 text-sm ${mine
                    ? 'text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
                    : 'bg-white border'}`}>
                  {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                  {m.image_url && (
                    <img src={m.image_url} alt="attachment" className="mt-2 rounded-xl border max-h-72 object-cover" />
                  )}
                  <div className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t bg-white">
        <div className="max-w-2xl mx-auto p-2 flex items-end gap-2">
          <label className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e)} />
            + Image
          </label>
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              placeholder="Write a message…"
              className="w-full border rounded-2xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {preview && (
              <div className="mt-2 relative inline-block">
                <img src={preview} alt="preview" className="h-20 rounded-lg border object-cover" />
                <button
                  onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null) }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border text-xs"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <button
            onClick={send}
            disabled={sending || (!text.trim() && !file)}
            className="shrink-0 px-4 py-2 rounded-full text-white disabled:opacity-50 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  )
}
