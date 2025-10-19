'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

export default function ProfileEditor({
  userId,
  initial,
  onSaved,
}: {
  userId: string
  initial: Profile | null
  onSaved?: (p: Profile) => void
}) {
  const [me, setMe] = useState<string | null>(null)
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial?.avatar_url ?? null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    // revoke object URL on unmount/change
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  if (!me || me !== userId) {
    return (
      <div className="p-3 rounded-lg border bg-gray-50 text-sm text-gray-600">
        You can only edit your own profile.
      </div>
    )
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }
    setError(null)
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function uploadAvatarIfNeeded(): Promise<string | null> {
    if (!file) return avatarUrl ?? null
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `avatars/${userId}.${ext}`

    // upsert so each new upload replaces previous
    const { error: upErr } = await supabase
      .storage
      .from('images')
      .upload(path, file, { contentType: file.type, upsert: true })
    if (upErr) throw upErr

    const { data } = supabase.storage.from('images').getPublicUrl(path)
    return data.publicUrl
  }

  async function save() {
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      // very light username validation
      const clean = username?.trim().toLowerCase() || null
      if (clean && !/^[a-z0-9_\.]{3,20}$/.test(clean)) {
        throw new Error('Username must be 3–20 chars (a–z, 0–9, _, .)')
      }

      const newAvatar = await uploadAvatarIfNeeded()

      const { data, error: updErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          username: clean,
          bio: bio.trim() || null,
          avatar_url: newAvatar,
        })
        .eq('id', userId)
        .select('*')
        .single()

      if (updErr) throw updErr

      setAvatarUrl(newAvatar ?? avatarUrl)
      setOk('Saved!')
      if (preview) {
        URL.revokeObjectURL(preview)
        setPreview(null)
      }
      setFile(null)
      onSaved?.(data as Profile)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 rounded-xl border bg-white shadow">
      <div className="flex items-start gap-4">
        <div>
          <div className="w-20 h-20 rounded-full overflow-hidden border bg-gray-100">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-gray-400">No avatar</div>
            )}
          </div>
          <label className="mt-2 inline-block text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            Change photo
          </label>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-sm text-gray-700">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. aurea_user"
              className="mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="mt-1 text-[11px] text-gray-500">3–20 chars: a–z, 0–9, underscore, dot</p>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {ok && <span className="text-sm text-green-600">{ok}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
