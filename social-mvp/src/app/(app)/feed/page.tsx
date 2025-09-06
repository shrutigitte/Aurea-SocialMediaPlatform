import PostComposer from '@/components/PostComposer'
import PostFeed from '@/components/PostFeed'

export default function FeedPage() {
  return (
    <section className="py-6">
      <h1 className="text-2xl font-bold mb-4">Your Feed</h1>

      {/* TO Write a post */}
      <PostComposer />

      {/* Next posts */}
      <div className="mt-4">
        <PostFeed />
      </div>
    </section>
  )
}
