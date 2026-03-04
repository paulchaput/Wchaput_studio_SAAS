import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/layout/AppSidebar'

export default async function AccountantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'accountant') {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar role="accountant" userName={profile?.full_name} />
      <main className="flex-1 overflow-auto p-6 bg-white">
        {children}
      </main>
    </div>
  )
}
