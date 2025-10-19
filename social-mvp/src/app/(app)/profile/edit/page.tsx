'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export default function EditProfilePage() {
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // form state
  const [initial, setInitial] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // username availability
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)

  // ---------------- Load me + profile ----------------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      if (!uid) {
        router.replace('/auth/login')
        return
      }
      setMe(uid)

      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .eq('id', uid)
        .maybeSingle()

      if (pErr) {
        console.error(pErr)
        setError(pErr.message)
      }

      const p = (prof as Profile) || null
      setInitial(p)
      setUsername((p?.username ?? '').toString())
      setFullName(p?.full_name ?? '')
      setBio(p?.bio ?? '')
      setAvatarUrl(p?.avatar_url ?? null)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------- Username lowercasing + availability ----------------
  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username])
  const usernameChanged = useMemo(
    () => normalizedUsername !== (initial?.username ?? ''),
    [normalizedUsername, initial?.username]
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!me) return
      // empty → no status
      if (!normalizedUsername) {
        setAvailable(null)
        return
      }
      // invalid → mark as unavailable (we’ll show regex hint)
      if (!USERNAME_REGEX.test(normalizedUsername)) {
        setAvailable(false)
        return
      }
      // unchanged → treat as available
      if (!usernameChanged) {
        setAvailable(true)
        return
      }

      setChecking(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', normalizedUsername) // CI enforced by DB unique index on lower(username)
        .maybeSingle()
      if (cancelled) return
      setChecking(false)
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = No rows found for view; treat like no match
        console.error('username check error', error)
        setAvailable(false)
        return
      }
      setAvailable(!data) // available if no row
    }

    const t = setTimeout(run, 250) // debounce
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [normalizedUsername, usernameChanged, me])

  // ---------------- Avatar upload ----------------
  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('Avatar must be ≤ 3MB.')
      return
    }
    setError(null)

    // optimistic preview
    const localUrl = URL.createObjectURL(file)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return localUrl
    })

    if (!me) return

    const ext = file.name.split('.').pop() || 'jpg'
    const safe = file.name.replace(/\s+/g, '-').toLowerCase()
    const path = `avatars/${me}/${Date.now()}-${safe}`

    const { error: upErr } = await supabase.storage.from('images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (upErr) {
      setError(upErr.message)
      return
    }
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
  }

  function clearAvatar() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(null)
    setAvatarUrl(null)
  }

  // ---------------- Save ----------------
  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!me) return
    setError(null)

    const uname = normalizedUsername
    if (uname && !USERNAME_REGEX.test(uname)) {
      setError('Username must be 3–20 chars: a–z, 0–9, underscore.')
      return
    }
    if (usernameChanged && available === false) {
      setError('That username is taken.')
      return
    }

    setSaving(true)
    const { error: uErr } = await supabase
      .from('profiles')
      .update({
        username: uname || null,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
      })
      .eq('id', me)

    setSaving(false)
    if (uErr) {
      setError(uErr.message)
      return
    }

    // Go to vanity URL if set, else fallback
    const next = uname ? `/u/${encodeURIComponent(uname)}` : `/profile/${me}`
    router.replace(next)
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-4 text-sm text-gray-500">Loading…</main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      <div className="mb-3">
        <Link href={initial?.username ? `/u/${initial.username}` : `/profile/${initial?.id ?? ''}`} className="text-sm text-purple-700 hover:underline">
          ← Back to profile
        </Link>
      </div>

      <h1 className="text-xl font-semibold">Edit profile</h1>

      <form onSubmit={onSave} className="mt-4 space-y-5">
        {/* Avatar */}
        <div className="p-4 border rounded-xl bg-white shadow">
          <div className="flex items-center gap-4">
            <img
              src={avatarPreview || avatarUrl || '/avatar-placeholder.png'}
              alt="Avatar preview"
              className="w-20 h-20 rounded-full object-cover border"
            />
            <div className="space-x-2">
              <label className="inline-block text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
                Change avatar
              </label>
              {(avatarUrl || avatarPreview) && (
                <button type="button" onClick={clearAvatar} className="inline-block text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Username */}
        <div className="p-4 border rounded-xl bg-white shadow">
          <label className="block text-sm font-medium text-gray-800">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. shruti"
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="mt-1 text-xs">
            {!normalizedUsername && <span className="text-gray-500">Optional. 3–20 chars: a–z, 0–9, _</span>}
            {normalizedUsername && !USERNAME_REGEX.test(normalizedUsername) && (
              <span className="text-red-600">Use 3–20 chars (a–z, 0–9, _).</span>
            )}
            {normalizedUsername && USERNAME_REGEX.test(normalizedUsername) && usernameChanged && (
              <>
                {checking && <span className="text-gray-500">Checking…</span>}
                {!checking && available === false && <span className="text-red-600">That username is taken.</span>}
                {!checking && available === true && <span className="text-green-700">Available ✓</span>}
              </>
            )}
          </div>
        </div>

        {/* Full name */}
        <div className="p-4 border rounded-xl bg-white shadow">
          <label className="block text-sm font-medium text-gray-800">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Bio */}
        <div className="p-4 border rounded-xl bg-white shadow">
          <label className="block text-sm font-medium text-gray-800">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A little something about you…"
            rows={4}
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) || (usernameChanged && available === false)}
            className="px-4 py-2 rounded text-white disabled:opacity-50 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </main>
  )
}
