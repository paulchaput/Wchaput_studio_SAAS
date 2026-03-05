'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types'

const adminNavItems = [
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Proveedores', href: '/proveedores' },
  { label: 'Dashboard', href: '/dashboard' },
]

const accountantNavItems = [
  { label: 'Resumen', href: '/resumen' },
  { label: 'Flujo de Efectivo', href: '/flujo-efectivo' },
]

interface SidebarNavProps {
  role: UserRole
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname()
  const items = role === 'admin' ? adminNavItems : accountantNavItems

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={[
                'block px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-[--sidebar-foreground] opacity-60 hover:opacity-100 hover:bg-white/5',
              ].join(' ')}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
