import { Header } from '@/components/Header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto p-4">{children}</main>
    </>
  )
}
