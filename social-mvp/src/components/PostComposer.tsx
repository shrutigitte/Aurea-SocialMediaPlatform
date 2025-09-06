// 'use client'

// import { useState } from 'react'
// import { supabase } from '@/lib/supabaseClient'

// export default function PostComposer() {
//   const [content, setContent] = useState('')
//   const [posting, setPosting] = useState(false)
//   const [error, setError] = useState<string | null>(null)

//   async function handlePost() {
//     const text = content.trim()
//     if (!text) return
//     setPosting(true)
//     setError(null)

//     // must be signed in; RLS policy requires author_id = auth.uid()
//     const { data: { user }, error: userErr } = await supabase.auth.getUser()
//     if (userErr || !user) {
//       setPosting(false)
//       setError('Please sign in first.')
//       return
//     }

//     const { error: insertErr } = await supabase.from('posts').insert({
//       author_id: user.id,   // <- matches schema (profiles.id)
//       content: text,
//     })

//     if (insertErr) setError(insertErr.message)
//     else setContent('')

//     setPosting(false)
//   }

//   return (
//     <div className="mb-6 p-4 border rounded-xl bg-white shadow">
//       <textarea
//         value={content}
//         onChange={(e) => setContent(e.target.value)}
//         placeholder="What’s on your mind?"
//         rows={3}
//         className="w-full resize-y border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
//       />
//       <div className="mt-3 flex items-center gap-2">
//         <button
//           onClick={handlePost}
//           disabled={posting || content.trim() === ''}
//           className="px-4 py-2 rounded text-white disabled:opacity-50 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition"
//         >
//           {posting ? 'Posting…' : 'Post'}
//         </button>
//         {error && <span className="text-sm text-red-600">{error}</span>}
//       </div>
//     </div>
//   )
// }
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PostComposer() {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePost() {
    const text = content.trim()
    if (!text) return
    setPosting(true)
    setError(null)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      setPosting(false)
      setError('Please sign in first.')
      return
    }

    const { error: insertErr } = await supabase
      .from('posts')
      .insert({ author_id: user.id, content: text }) // <-- matches your schema

    if (insertErr) setError(insertErr.message)
    else setContent('')

    setPosting(false)
  }

  return (
    <div className="mb-6 p-4 border rounded-xl bg-white shadow">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What’s on your mind?"
        rows={3}
        className="w-full resize-y border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handlePost}
          disabled={posting || content.trim() === ''}
          className="px-4 py-2 rounded text-white disabled:opacity-50 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
