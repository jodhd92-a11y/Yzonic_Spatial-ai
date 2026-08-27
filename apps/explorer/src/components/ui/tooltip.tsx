import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delay = 250,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "right",
  sideOffset = 10,
  children,
  ...props
}: TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            // Premium enterprise chrome — a solid, elevated panel (theme-aware
            // via the sp-bg-2 var, not a hardcoded hex, so it stays
            // correct under the Light theme too) that's a full step lighter
            // than the sidebar/page background instead of matching it, plus
            // a brighter border and a real drop shadow, so the popup reads
            // as its own surface instead of blending into dark chrome. Sits
            // at z-[100] — above every other overlay in the app (modals,
            // menus, the mobile sidebar backdrop all top out at z-60) — so
            // it can never end up hidden behind one of them.
            "z-[100] w-fit origin-[var(--transform-origin)] rounded-lg border border-[var(--sp-primary)]/35",
            "bg-[var(--sp-bg-2)] shadow-[0_10px_30px_rgba(0,0,0,0.55)]",
            "px-3 py-1.5 text-[12px] font-medium tracking-[0.01em] text-[var(--sp-text)] text-balance",
            "transition-[transform,scale,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

// Small kbd-style chip for a shortcut hint inside a tooltip — e.g.
// `<TooltipContent><span className="flex items-center gap-2">Camera<TooltipShortcut>⌘1</TooltipShortcut></span></TooltipContent>`.
// Matches the shortcut chips used elsewhere in the app's chrome (sidebar,
// profile menu) so a tooltip reads as one more premium, consistent
// surface rather than a plain text bubble.
function TooltipShortcut({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-auto shrink-0 rounded border border-[var(--sp-border)] bg-[var(--sp-surface)] px-1.5 py-[1px] font-mono text-[10px] font-normal tracking-normal text-[var(--sp-text-faint)]">
      {children}
    </kbd>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipShortcut }
