'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function CommentBox({
  postId,
  onCommentAdded,
}: {
  postId: number
  onCommentAdded?: () => void
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const body = text.trim()
    if (!body) return

    setLoading(true)
    setError(null)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      setError('Please sign in to comment.')
      setLoading(false)
      return
    }

    const { error: insertErr } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: user.id, body })

    if (insertErr) {
      setError(insertErr.message)
    } else {
      setText('')
      onCommentAdded && onCommentAdded()
    }

    setLoading(false)
  }

  return (
    <div className="mt-2 p-2 border rounded-lg bg-white">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a comment…"
        className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={loading || text.trim() === ''}
          className="px-3 py-1 rounded text-white text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? 'Posting…' : 'Comment'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
