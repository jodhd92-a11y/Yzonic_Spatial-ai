'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipShortcut } from '@/components/ui/tooltip'

// ─────────────────────────────────────────────────────────────────────────
// This is a *scoped* port of shadcn/ui's sidebar primitives — the menu
// building blocks only (SidebarGroup, SidebarMenu, SidebarMenuButton, …).
//
// It deliberately does NOT reimplement the canonical shadcn SidebarProvider
// (cookie persistence, its own `--sidebar-width` CSS var, built-in mobile
// Sheet, Cmd/Ctrl+B shortcut). This app already owns that layout logic —
// AppShell drives `--sp-sidebar-w` from Zustand, and Sidebar.tsx already
// handles the mobile drawer. Rebuilding a second, parallel state system
// here would fight the existing one instead of slotting into it.
// ─────────────────────────────────────────────────────────────────────────

type SidebarContextValue = {
  collapsed: boolean
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar must be used within a <SidebarProvider>')
  }
  return ctx
}

function SidebarProvider({
  collapsed,
  children,
}: {
  collapsed: boolean
  children: React.ReactNode
}) {
  const value = React.useMemo(() => ({ collapsed }), [collapsed])
  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delay={300}>{children}</TooltipProvider>
    </SidebarContext.Provider>
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn('flex flex-col gap-0.5', className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const { collapsed } = useSidebar()
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        'flex items-center gap-1.5 px-3 pb-1.5 h-5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 transition-opacity duration-150',
        collapsed && 'opacity-0 pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  // Collapsed rail gets noticeably more breathing room between rows than
  // the expanded list — with only icons on screen (no label text to
  // separate them visually), a tight gap made the Camera/Chat icons read
  // as one fused block. Expanded stays at the original tight gap, where
  // the label text already does that separating work.
  const { collapsed } = useSidebar()
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn(
        'flex w-full min-w-0 flex-col px-2 transition-[gap] duration-200',
        collapsed ? 'gap-3' : 'gap-0.5',
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn('relative list-none', className)}
      {...props}
    />
  )
}

interface SidebarMenuButtonProps extends React.ComponentProps<'button'> {
  isActive?: boolean
  tooltip?: string
  /** Optional shortcut hint (e.g. "⌘1"), shown as a chip inside the collapsed-rail tooltip. */
  tooltipShortcut?: string
  /** Stable id shared across the active row so the highlight glides between rows on change. */
  activeIndicatorId?: string
}

function SidebarMenuButton({
  className,
  isActive = false,
  tooltip,
  tooltipShortcut,
  activeIndicatorId = 'sidebar-active-indicator',
  children,
  ...props
}: SidebarMenuButtonProps) {
  const { collapsed } = useSidebar()

  const button = (
    <button
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        'group/menu-button relative flex w-full items-center gap-3 overflow-hidden rounded-xl py-2.5 pl-3 pr-3 text-left text-[14px] font-medium whitespace-nowrap transition-colors outline-none',
        'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'data-[active=true]:bg-sidebar-primary/[0.12] data-[active=true]:text-sidebar-primary data-[active=true]:shadow-[inset_0_0_0_1px_rgba(var(--sp-primary-rgb),0.28)]',
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={activeIndicatorId}
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary shadow-[0_0_10px_rgba(var(--sp-primary-rgb),0.9)]"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      {children}
    </button>
  )

  if (!collapsed || !tooltip) {
    return button
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right" sideOffset={14} align="center">
        <span className="flex items-center gap-3">
          {tooltip}
          {tooltipShortcut && <TooltipShortcut>{tooltipShortcut}</TooltipShortcut>}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarMenuButtonLabel({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  const { collapsed } = useSidebar()
  return (
    <span
      data-slot="sidebar-menu-button-label"
      className={cn('min-w-0 flex-1 truncate transition-opacity duration-150', className)}
      style={{ opacity: collapsed ? 0 : 1 }}
      {...props}
    />
  )
}

function SidebarMenuSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', className)}
    >
      <div className="size-[18px] shrink-0 animate-pulse rounded-md bg-sidebar-foreground/10" />
      <div className="h-3 flex-1 animate-pulse rounded bg-sidebar-foreground/10" />
    </div>
  )
}

export {
  SidebarProvider,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuButtonLabel,
  SidebarMenuSkeleton,
}
