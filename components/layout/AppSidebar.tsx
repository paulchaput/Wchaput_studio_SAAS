import type { UserRole } from '@/lib/types'
import { SidebarNav } from './SidebarNav'
import { logoutAction } from '@/lib/actions/auth'

interface AppSidebarProps {
  role: UserRole
  userName?: string | null
}

export function AppSidebar({ role, userName }: AppSidebarProps) {
  return (
    <aside className="h-screen w-64 flex-shrink-0 flex flex-col bg-[--sidebar-background] text-[--sidebar-foreground]">
      {/* Studio name */}
      <div className="p-6 border-b border-[--sidebar-border]">
        <p className="text-xs font-semibold tracking-widest uppercase opacity-60">
          W Chaput Studio
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <SidebarNav role={role} />
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-[--sidebar-border]">
        {userName && (
          <p className="text-xs opacity-50 mb-2 truncate">{userName}</p>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left text-xs opacity-60 hover:opacity-100 transition-opacity px-3 py-2 rounded-md hover:bg-white/5"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
