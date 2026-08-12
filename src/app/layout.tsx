import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#14A44D',
}

export const metadata: Metadata = {
  title: 'WEB BASED RESULT PUBLICATION SYSTEM FOR EDUCATION BOARD',
  description: 'All Bangladesh Education Board Result Archive, with Detailed Marks if available, for JSC, JDC, SSC, DAKHIL, HSC, ALIM, VOCATIONAL exams',
  keywords: 'education,board,result,jsc,jdc,ssc,hsc,dakhil,alim,vocational,marks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="modal"></div>
        {children}
      </body>
    </html>
  )
}
