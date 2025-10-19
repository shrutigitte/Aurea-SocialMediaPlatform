'use client'

type Profile = {
  id?: string
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
}

export default function ProfileAvatar({
  profile,
  size = 36,
}: {
  profile?: Profile
  size?: number
}) {
  const name = profile?.full_name || profile?.username || 'User'
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-purple-100"
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full flex items-center justify-center text-white text-xs font-semibold
                 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  )
}

