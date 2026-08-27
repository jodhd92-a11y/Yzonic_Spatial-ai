<script setup lang="ts">
// Shown once per app version on first open — same idea as Claude's /
// Kimi's "what's new" splash. Introduces the Nexus 1.0 model family and
// flags that Ravo itself is still in beta, so people aren't surprised
// when something rough turns up.
import { ref, onMounted } from 'vue'
import { Sparkles, FlaskConical, Zap, Mic, Palette, ArrowRight, X } from 'lucide-vue-next'
import LogoBadge from './LogoBadge.vue'
import { MODELS } from '@/stores/chat'

// Bump this when there's something new worth announcing again — it's the
// version stamped into localStorage so returning users only see the
// billboard once per release, not on every reload.
const BILLBOARD_VERSION = 'ravo-2025.1-nexus'
const STORAGE_KEY = 'sp-billboard-seen'

const open = ref(false)

onMounted(() => {
  try {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen !== BILLBOARD_VERSION) {
      // Small delay so it arrives after the shell's own mount/paint
      // transition instead of popping in mid-layout-shift.
      setTimeout(() => { open.value = true }, 260)
    }
  } catch {
    open.value = true
  }
})

function dismiss() {
  open.value = false
  try {
    localStorage.setItem(STORAGE_KEY, BILLBOARD_VERSION)
  } catch {
    /* ignore */
  }
}

const highlights = [
  { icon: Sparkles, title: 'Meet the Nexus 1.0 family', body: 'Three new models tuned for different jobs — balanced, fast & light, or deep multi-step reasoning.' },
  { icon: Mic, title: 'Voice mode', body: 'Tap to dictate or hold to record — speak a message straight into the composer.' },
  { icon: Palette, title: 'Deeper customization', body: 'New accents, densities, and bubble styles in Settings to make Ravo feel like yours.' },
  { icon: Zap, title: 'Faster, smoother streaming', body: 'Responses render with less jank, even on longer threads.' },
]
</script>

<template>
  <Transition
    enter-active-class="sp-bb-backdrop-enter"
    leave-active-class="sp-bb-backdrop-leave"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 py-8"
      @click.self="dismiss"
    >
      <Transition
        appear
        enter-active-class="sp-bb-panel-enter"
        leave-active-class="sp-bb-panel-leave"
        enter-from-class="sp-bb-panel-hidden"
        leave-to-class="sp-bb-panel-hidden"
      >
        <div
          v-if="open"
          class="sp-billboard relative flex w-full max-w-[560px] max-h-[88vh] flex-col overflow-hidden rounded-[28px] border border-[var(--sp-border-hover)] bg-[var(--sp-bg-1)] shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
        >
          <!-- Ambient aurora header -->
          <div class="relative shrink-0 overflow-hidden px-5 pt-7 pb-6 sm:px-9 sm:pt-10 sm:pb-7">
            <div class="pointer-events-none absolute inset-0 -z-10">
              <div class="sp-bb-aurora sp-bb-aurora--a" />
              <div class="sp-bb-aurora sp-bb-aurora--b" />
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,var(--sp-bg-1)_85%)]" />
              <div class="sp-bb-grid absolute inset-0 opacity-[0.05]" />
            </div>

            <button
              class="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[var(--sp-text-faint)] transition-colors hover:bg-white/[0.08] hover:text-[var(--sp-text)] sm:right-4 sm:top-4 sm:h-auto sm:w-auto sm:p-1.5"
              v-tooltip="'Close'"
              aria-label="Close"
              @click="dismiss"
            >
              <X :size="16" />
            </button>

            <LogoBadge :size="52" class="sp-bb-badge" />

            <h1 class="sp-bb-heading mt-5 text-[24px] font-bold leading-tight text-[var(--sp-text)] sm:text-[30px]">
              What's new in <span class="sp-bb-gradient-text">Ravo</span>
            </h1>
            <p class="mt-2 max-w-[420px] text-[13px] leading-relaxed text-[var(--sp-text-dim)] sm:text-[13.5px]">
              A faster composer, new models, and a handful of details refined across the whole app.
            </p>

            <div class="mt-4 inline-flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-3 py-2.5">
              <FlaskConical :size="15" class="mt-0.5 shrink-0 text-amber-300" />
              <p class="text-[12px] leading-relaxed text-amber-100/90">
                Ravo is currently in development. It's in beta, so some features might not work exactly as expected yet — thanks for bearing with us.
              </p>
            </div>
          </div>

          <!-- Scrollable body — flex-1 + min-h-0 so it's the section that
               gives way on short viewports; the footer below always stays
               visible instead of being clipped by the panel's own
               overflow-hidden. -->
          <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-2 sm:px-9">
            <ul class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <li
                v-for="(h, i) in highlights"
                :key="h.title"
                class="sp-bb-card group rounded-2xl border border-[var(--sp-border)] bg-white/[0.025] p-3.5 transition-colors hover:border-[var(--sp-border-hover)] hover:bg-white/[0.045]"
                :style="{ animationDelay: `${90 + i * 60}ms` }"
              >
                <div
                  class="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg"
                  style="background: linear-gradient(135deg, rgba(var(--sp-primary-rgb), 0.18), rgba(var(--sp-accent-rgb), 0.14))"
                >
                  <component :is="h.icon" :size="15" class="text-[var(--sp-primary)]" />
                </div>
                <p class="text-[13px] font-semibold text-[var(--sp-text)]">{{ h.title }}</p>
                <p class="mt-1 text-[12px] leading-relaxed text-[var(--sp-text-faint)]">{{ h.body }}</p>
              </li>
            </ul>

            <div class="my-4 rounded-2xl border border-[var(--sp-border)] bg-white/[0.02] p-3.5">
              <p class="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Now available</p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="m in MODELS"
                  :key="m.id"
                  class="rounded-full border border-[var(--sp-border)] bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-[var(--sp-text-dim)]"
                >
                  {{ m.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--sp-border)] bg-[var(--sp-bg-1)]/80 px-5 py-3.5 backdrop-blur sm:px-9 sm:py-4">
            <span class="hidden text-[11.5px] text-[var(--sp-text-faint)] sm:inline">You're on the latest version</span>
            <button
              class="sp-bb-cta group inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold text-black transition-transform active:scale-[0.97] sm:w-auto sm:justify-start"
              @click="dismiss"
            >
              Let's go
              <ArrowRight :size="14" class="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.sp-billboard {
  font-family: ui-sans-serif, system-ui, -apple-system, 'Inter', 'Segoe UI', sans-serif;
}

.sp-bb-heading {
  font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.01em;
}

.sp-bb-gradient-text {
  background: linear-gradient(120deg, var(--sp-primary), var(--sp-accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.sp-bb-aurora {
  position: absolute;
  border-radius: 999px;
  filter: blur(60px);
  opacity: 0.5;
  animation: sp-drift 14s ease-in-out infinite;
}
.sp-bb-aurora--a {
  top: -60px;
  left: -40px;
  width: 260px;
  height: 200px;
  background: radial-gradient(circle, var(--sp-primary) 0%, transparent 70%);
}
.sp-bb-aurora--b {
  top: -30px;
  right: -60px;
  width: 220px;
  height: 200px;
  background: radial-gradient(circle, var(--sp-accent) 0%, transparent 70%);
  animation-delay: -7s;
}
.sp-bb-grid {
  background-image:
    linear-gradient(to right, var(--sp-text) 1px, transparent 1px),
    linear-gradient(to bottom, var(--sp-text) 1px, transparent 1px);
  background-size: 36px 36px;
}

.sp-bb-badge {
  animation: sp-bb-badge-in 0.6s cubic-bezier(.34, 1.56, .64, 1) both;
  animation-delay: 0.05s;
}

.sp-bb-card {
  animation: sp-bb-card-in 0.5s cubic-bezier(.22, .61, .36, 1) both;
}

.sp-bb-cta {
  background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent));
  box-shadow: 0 8px 24px -6px rgba(var(--sp-primary-rgb), 0.5);
}
.sp-bb-cta:hover {
  box-shadow: 0 10px 30px -6px rgba(var(--sp-primary-rgb), 0.65);
}

@keyframes sp-bb-badge-in {
  from { opacity: 0; transform: scale(0.6) rotate(-12deg); }
  to   { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes sp-bb-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sp-drift {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(3%, -4%, 0) scale(1.08); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
}

.sp-bb-backdrop-enter { transition: opacity 0.25s ease-out; }
.sp-bb-backdrop-leave { transition: opacity 0.18s ease-in; }

.sp-bb-panel-enter { transition: opacity 0.32s cubic-bezier(.22,.61,.36,1), transform 0.42s cubic-bezier(.22,1,.36,1); }
.sp-bb-panel-leave { transition: opacity 0.16s ease-in, transform 0.2s ease-in; }
.sp-bb-panel-hidden { opacity: 0; transform: translateY(18px) scale(0.96); }

@media (max-width: 640px) {
  .sp-bb-aurora {
    filter: blur(36px);
    opacity: 0.32;
  }
}
</style>
