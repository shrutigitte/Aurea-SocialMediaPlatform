
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PostComposer() {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // image state
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    // cleanup preview URL
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    // basic size/type checks
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.')
      return
    }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearImage() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  async function handlePost() {
    const text = content.trim()
    if (!text && !file) return // require text or image
    setPosting(true)
    setError(null)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      setPosting(false)
      setError('Please sign in first.')
      return
    }

    let imageUrl: string | null = null

    // 1) upload image (if any)
    if (file) {
      const ext = file.name.split('.').pop() || 'jpg'
      const sanitizedName = file.name.replace(/\s+/g, '-').toLowerCase()
      const path = `${user.id}/${Date.now()}-${sanitizedName}`

      const { error: upErr } = await supabase
        .storage
        .from('images')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (upErr) {
        setPosting(false)
        setError(upErr.message)
        return
      }

      const { data } = supabase.storage.from('images').getPublicUrl(path)
      imageUrl = data.publicUrl
    }

    // 2) insert post row
    const { error: insertErr } = await supabase.from('posts').insert({
      author_id: user.id,         // matches your schema
      content: text || null,      // allow image-only posts
      image_url: imageUrl,        // may be null
    })

    if (insertErr) {
      setError(insertErr.message)
      setPosting(false)
      return
    }

    // reset composer
    setContent('')
    clearImage()
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

      {/* image picker + preview */}
      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          Add image
        </label>

        {file && (
          <button
            type="button"
            onClick={clearImage}
            className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50"
          >
            Remove
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-3">
          <img
            src={preview}
            alt="Selected"
            className="max-h-72 rounded-lg border object-cover"
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handlePost}
          disabled={posting || (!content.trim() && !file)}
          className="px-4 py-2 rounded text-white disabled:opacity-50 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
