
import './globals.css'

export const metadata = { title: 'Aurea' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fleur+De+Leah&family=Quintessential&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#fafafa] text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
