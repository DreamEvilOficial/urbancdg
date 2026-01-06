import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Administración | URBAN',
  description: 'Panel de administración',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full min-h-screen overflow-hidden bg-transparent">
      {children}
    </div>
  )
}
