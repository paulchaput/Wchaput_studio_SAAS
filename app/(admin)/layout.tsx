import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/resumen')
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 flex-shrink-0 bg-[--sidebar-background] text-[--sidebar-foreground] flex flex-col">
        <div className="p-6 border-b border-[--sidebar-border]">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-60">W Chaput Studio</p>
        </div>
        <nav className="flex-1 p-4">
          <p className="text-xs opacity-40">Navegación — Plan 01-03</p>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6 bg-white">
        {children}
      </main>
    </div>
  )
}
