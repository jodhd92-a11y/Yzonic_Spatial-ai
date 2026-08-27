<script setup lang="ts">
// "Ravo Doodle" — the badge above the composer re-themes itself around
// real-world occasions (festivals, holidays, major sporting events), the
// same way Google's homepage logo does, with a small animated motif
// orbiting the badge and a hover caption naming the occasion. See
// src/lib/doodleEvents.ts for the calendar and src/composables/useDoodle.ts
// for how "today's" event is picked and refreshed at midnight.
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useDoodle } from '@/composables/useDoodle'
import LogoBadge from './LogoBadge.vue'

const props = withDefaults(defineProps<{ size?: number; interactive?: boolean }>(), {
  size: 52,
  interactive: false,
})

const { event } = useDoodle()

const overlaySize = computed(() => Math.round(props.size * 2.1))
const motif = computed(() => event.value?.motif ?? 'default')
const label = computed(() => event.value?.label ?? '')
const displayName = computed(() => label.value || 'Ravo')
const nameLetters = computed(() => displayName.value.split(''))
const colorVars = computed(() => ({
  '--doodle-c1': event.value?.colors.primary ?? 'var(--sp-primary)',
  '--doodle-c2': event.value?.colors.accent ?? 'var(--sp-accent)',
}))

// Deterministic small "random" spread for particle fields, so it looks
// organic without changing every re-render.
function seeded(i: number, mod: number, offset = 0) {
  return ((i * 53 + offset * 17) % mod)
}
const particles = Array.from({ length: 10 }, (_, i) => i)

// Click the badge and it goes off — a full 10-second show: the badge
// blows up behind a morphing blob halo, several staggered confetti +
// shockwave beats (building to one last big finale near the end) fire
// across the whole window instead of a single pop, a field of sparkles
// drifts continuously the entire time, and its name pops in letter by
// letter in a chunky display font. Then it all settles back down.
const CELEBRATE_MS = 10000
const CONFETTI_COLORS = ['var(--doodle-c1)', 'var(--doodle-c2)', '#ffd93d', '#4fc3f7', '#ff6b9d', '#66bb6a', '#b388ff']
type ConfettiBit = { id: number; angle: number; distance: number; delay: number; size: number; color: string; spin: number }
const celebrating = ref(false)
const confetti = ref<ConfettiBit[]>([])
const shockwaves = ref<{ id: number }[]>([])
const sparkles = ref<{ id: number; x: number; y: number; delay: number; size: number }[]>([])

let celebrateTimer: ReturnType<typeof setTimeout> | null = null
let beatTimers: ReturnType<typeof setTimeout>[] = []
let burstSeq = 0

function fireBurst(count = 22, power = 1) {
  const batch = ++burstSeq
  confetti.value = Array.from({ length: count }, (_, i) => ({
    id: batch * 1000 + i,
    angle: (i / count) * 360 + (Math.random() * 14 - 7),
    distance: (54 + Math.random() * 44) * power,
    delay: Math.random() * 0.35,
    size: 3 + Math.random() * 3.5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    spin: Math.random() > 0.5 ? 1 : -1,
  }))
  shockwaves.value = [...shockwaves.value, { id: batch }]
  // Keep the shockwave list from growing forever across a celebration —
  // each ring is fully faded within ~1.1s so this is safe to prune.
  setTimeout(() => {
    shockwaves.value = shockwaves.value.filter((w) => w.id !== batch)
  }, 1200)
}

function celebrate() {
  showHint.value = false
  if (hintTimer) { clearTimeout(hintTimer); hintTimer = null }

  beatTimers.forEach(clearTimeout)
  beatTimers = []

  // A field of small sparkles drifts around the badge for the whole
  // celebration — this is what keeps the last few seconds from feeling
  // static once the confetti's settled.
  sparkles.value = Array.from({ length: 9 }, (_, i) => ({
    id: i,
    x: 50 + 62 * Math.cos((i / 9) * Math.PI * 2),
    y: 50 + 62 * Math.sin((i / 9) * Math.PI * 2),
    delay: seeded(i, 10) * 0.22,
    size: 3 + seeded(i, 4),
  }))

  fireBurst(22, 1)
  beatTimers.push(setTimeout(() => fireBurst(16, 0.85), 2100))
  beatTimers.push(setTimeout(() => fireBurst(18, 1.05), 4400))
  beatTimers.push(setTimeout(() => fireBurst(16, 0.85), 6600))
  beatTimers.push(setTimeout(() => fireBurst(30, 1.3), 8600)) // finale — biggest of the show

  celebrating.value = true
  if (celebrateTimer) clearTimeout(celebrateTimer)
  celebrateTimer = setTimeout(() => {
    celebrating.value = false
    sparkles.value = []
    celebrateTimer = null
  }, CELEBRATE_MS)
}

onBeforeUnmount(() => {
  if (celebrateTimer) clearTimeout(celebrateTimer)
  beatTimers.forEach(clearTimeout)
  if (hintTimer) clearTimeout(hintTimer)
})

// A brief, self-dismissing side message — the same idea as Claude's own
// little toasts — nudging a first-time viewer to click the badge. Shows
// once whenever the doodle is present, for exactly 3.7 seconds, then goes
// away on its own (or immediately if they've already clicked).
const HINT_MS = 3700
const showHint = ref(false)
let hintTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  showHint.value = true
  hintTimer = setTimeout(() => {
    showHint.value = false
    hintTimer = null
  }, HINT_MS)
})
</script>

<template>
  <div
    class="doodle"
    :class="{ 'doodle--celebrating': celebrating }"
    :style="{ width: `${overlaySize}px`, height: `${overlaySize}px`, ...colorVars }"
    role="button"
    tabindex="0"
    :aria-label="`${label || 'Ravo'} — click to celebrate`"
    @click="celebrate"
    @keydown.enter="celebrate"
    @keydown.space.prevent="celebrate"
  >
    <!-- One-time "click me" nudge — a small side toast, gone after 3.7s
         (or the moment they click). -->
    <Transition name="doodle-hint-fade">
      <div v-if="showHint" class="doodle__hint" role="status">
        <span class="doodle__hint-sparkle">✨</span>
        Click me for something beautiful
      </div>
    </Transition>

    <!-- Idle ambient life: a slow-breathing halo + a soft light sweep,
         always on at low intensity, so the badge reads as "alive" and
         worth clicking even before anyone has touched it. Fades out the
         moment celebration takes over. -->
    <div v-if="!celebrating" class="doodle__idle-halo" aria-hidden="true" />
    <div
      v-if="!celebrating"
      class="doodle__idle-shimmer"
      :style="{ width: `${props.size}px`, height: `${props.size}px`, borderRadius: `${Math.round(props.size * 0.32)}px` }"
      aria-hidden="true"
    />

    <!-- Curvy blob halo, only for the celebration — sits behind the badge
         so the badge's own shape/hover behavior is never touched. -->
    <div v-if="celebrating" class="doodle__blob" aria-hidden="true" />

    <!-- Shockwave rings, one per confetti beat. -->
    <div v-if="celebrating" class="doodle__shockwaves" aria-hidden="true">
      <span v-for="w in shockwaves" :key="w.id" class="dd-shockwave" />
    </div>

    <!-- Confetti bursts, staggered across the whole celebration. -->
    <div v-if="celebrating" class="doodle__confetti" aria-hidden="true">
      <span
        v-for="c in confetti"
        :key="c.id"
        class="dd-confetti-bit"
        :style="{
          '--dx': `${Math.cos((c.angle * Math.PI) / 180) * c.distance}px`,
          '--dy': `${Math.sin((c.angle * Math.PI) / 180) * c.distance}px`,
          '--spin': c.spin,
          width: `${c.size}px`,
          height: `${c.size}px`,
          background: c.color,
          animationDelay: `${c.delay}s`,
        }"
      />
    </div>

    <!-- A field of sparkles drifting the whole 10 seconds, so the tail
         end of the celebration still feels alive between confetti beats. -->
    <div v-if="celebrating" class="doodle__sparkle-field" aria-hidden="true">
      <span
        v-for="s in sparkles"
        :key="s.id"
        class="dd-field-sparkle"
        :style="{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`, animationDelay: `${s.delay}s` }"
      />
    </div>

    <Transition name="doodle-fade" mode="out-in">
      <svg
        v-if="motif !== 'default'"
        :key="event?.id"
        class="doodle__overlay"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <!-- Fireworks: bursts radiating outward, staggered -->
        <g v-if="motif === 'fireworks'">
          <g v-for="i in particles" :key="i" class="dd-firework" :style="{ animationDelay: `${seeded(i, 5, 1) * 0.35}s` }">
            <circle
              :cx="50 + 34 * Math.cos((i / particles.length) * Math.PI * 2)"
              :cy="50 + 34 * Math.sin((i / particles.length) * Math.PI * 2)"
              r="1.6"
              :fill="i % 2 ? 'var(--doodle-c1)' : 'var(--doodle-c2)'"
            />
          </g>
        </g>

        <!-- Hearts drifting upward around the badge -->
        <g v-else-if="motif === 'hearts'">
          <path
            v-for="i in particles.slice(0, 6)"
            :key="i"
            class="dd-heart"
            :style="{ animationDelay: `${seeded(i, 6, 2) * 0.5}s`, transformOrigin: `${8 + i * 15}px 90px` }"
            :transform="`translate(${8 + i * 15}, 88) scale(0.55)`"
            d="M7 3c-2-3-7-1-7 3 0 4 7 8 7 8s7-4 7-8c0-4-5-5-7-3z"
            fill="var(--doodle-c1)"
          />
        </g>

        <!-- Holi color spatter -->
        <g v-else-if="motif === 'colors'">
          <circle
            v-for="i in particles"
            :key="i"
            class="dd-spatter"
            :cx="50 + 38 * Math.cos((i / particles.length) * Math.PI * 2 + 0.3)"
            :cy="50 + 38 * Math.sin((i / particles.length) * Math.PI * 2 + 0.3)"
            :r="2 + seeded(i, 3)"
            :fill="['var(--doodle-c1)', 'var(--doodle-c2)', '#a3e635', '#4fc3f7'][i % 4]"
            :style="{ animationDelay: `${seeded(i, 4, 3) * 0.3}s` }"
          />
        </g>

        <!-- Eid crescent + twinkling stars -->
        <g v-else-if="motif === 'crescent'">
          <path d="M76 22a20 20 0 1 0 0 30 24 24 0 1 1 0-30z" fill="var(--doodle-c2)" class="dd-crescent-glow" />
          <g v-for="i in [0, 1, 2]" :key="i" class="dd-twinkle" :style="{ animationDelay: `${i * 0.6}s` }">
            <circle :cx="20 + i * 8" :cy="18 + i * 14" r="1.3" fill="var(--doodle-c1)" />
          </g>
        </g>

        <!-- Flag ribbon (Republic Day / Independence Day) -->
        <g v-else-if="motif === 'flag'" class="dd-flag">
          <rect x="4" y="6" width="26" height="6" fill="#ff9933" rx="1" />
          <rect x="4" y="12" width="26" height="6" fill="#ffffff" rx="1" />
          <rect x="4" y="18" width="26" height="6" fill="#138808" rx="1" />
          <circle cx="17" cy="15" r="1.6" fill="#22409a" />
        </g>

        <!-- Diwali diyas glowing around the ring -->
        <g v-else-if="motif === 'diyas'">
          <g v-for="i in [0, 1, 2, 3, 4, 5]" :key="i" class="dd-diya" :style="{ animationDelay: `${seeded(i, 6, 4) * 0.4}s` }">
            <ellipse
              :cx="50 + 36 * Math.cos((i / 6) * Math.PI * 2)"
              :cy="50 + 36 * Math.sin((i / 6) * Math.PI * 2)"
              rx="1.4" ry="1"
              fill="var(--doodle-c1)"
            />
            <circle
              :cx="50 + 36 * Math.cos((i / 6) * Math.PI * 2)"
              :cy="50 + 36 * Math.sin((i / 6) * Math.PI * 2) - 1.6"
              r="0.9"
              fill="#fff6d9"
              class="dd-diya-flame"
            />
          </g>
        </g>

        <!-- Halloween bats -->
        <g v-else-if="motif === 'spooky'">
          <path
            v-for="i in [0, 1, 2]"
            :key="i"
            class="dd-bat"
            :style="{ animationDelay: `${i * 0.7}s` }"
            d="M0 0c-3-3-8-2-8 1 2-1 4 0 5 1-2 0-4 2-4 4 2-1 4-1 5-2 1 1 3 1 5 2 0-2-2-4-4-4 1-1 3-2 5-1 0-3-5-4-8-1z"
            fill="var(--doodle-c2)"
          />
        </g>

        <!-- Snow falling for the winter holidays -->
        <g v-else-if="motif === 'snow'">
          <circle
            v-for="i in particles"
            :key="i"
            class="dd-snow"
            :cx="6 + seeded(i, 90, 5)"
            cy="0"
            r="1.3"
            fill="var(--doodle-c1)"
            :style="{ animationDelay: `${seeded(i, 8, 6) * 0.5}s`, animationDuration: `${3 + seeded(i, 3)}s` }"
          />
        </g>

        <!-- Olympic rings orbiting -->
        <g v-else-if="motif === 'rings'" class="dd-rings">
          <circle v-for="(c, i) in ['#4fc3f7', '#000000', '#ff6b9d', '#ffd93d', '#66bb6a']" :key="i"
            :cx="50 + 33 * Math.cos((i / 5) * Math.PI * 2)"
            :cy="50 + 33 * Math.sin((i / 5) * Math.PI * 2)"
            r="4" fill="none" :stroke="c" stroke-width="1.6" />
        </g>

        <!-- Football orbiting for the World Cup -->
        <g v-else-if="motif === 'ball'" class="dd-ball-orbit">
          <circle cx="50" cy="10" r="3.4" fill="#fff" stroke="var(--doodle-c1)" stroke-width="1" />
          <path d="M50 8l1.4 1-.5 1.6h-1.8l-.5-1.6z" fill="var(--doodle-c1)" transform="translate(0,10) scale(1)" />
        </g>

        <!-- Raksha Bandhan: rakhi threads swaying gently around the ring -->
        <g v-else-if="motif === 'rakhi'">
          <g
            v-for="i in [0, 1, 2, 3, 4]"
            :key="i"
            class="dd-rakhi"
            :style="{
              transformOrigin: `${(50 + 36 * Math.cos((i / 5) * Math.PI * 2)).toFixed(2)}px ${(50 + 36 * Math.sin((i / 5) * Math.PI * 2) - 6).toFixed(2)}px`,
              animationDelay: `${seeded(i, 5, 7) * 0.3}s`,
            }"
          >
            <line
              :x1="50 + 36 * Math.cos((i / 5) * Math.PI * 2)" :y1="50 + 36 * Math.sin((i / 5) * Math.PI * 2) - 6"
              :x2="50 + 36 * Math.cos((i / 5) * Math.PI * 2)" :y2="50 + 36 * Math.sin((i / 5) * Math.PI * 2) - 3"
              stroke="var(--doodle-c2)" stroke-width="0.6"
            />
            <circle :cx="50 + 36 * Math.cos((i / 5) * Math.PI * 2)" :cy="50 + 36 * Math.sin((i / 5) * Math.PI * 2)" r="2.1" fill="var(--doodle-c1)" />
            <circle :cx="50 + 36 * Math.cos((i / 5) * Math.PI * 2)" :cy="50 + 36 * Math.sin((i / 5) * Math.PI * 2)" r="0.9" fill="var(--doodle-c2)" />
          </g>
        </g>

        <!-- Tribute: a single quiet, still ribbon — no bursts, no confetti -->
        <g v-else-if="motif === 'tribute'">
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--doodle-c1)" stroke-width="1" opacity="0.35" />
        </g>
      </svg>
    </Transition>

    <LogoBadge :size="props.size" :interactive="props.interactive || celebrating" class="doodle__badge" />

    <Transition name="doodle-caption-fade">
      <div v-if="!celebrating" class="doodle__caption">{{ label || 'Ravo' }}</div>
      <div v-else class="doodle__celebrate-name">
        <span
          v-for="(ch, i) in nameLetters"
          :key="i"
          class="dd-letter"
          :style="{ animationDelay: `${0.35 + i * 0.05}s` }"
        >{{ ch === ' ' ? '\u00A0' : ch }}</span>
        <span class="dd-sparkle" :style="{ animationDelay: `${0.35 + nameLetters.length * 0.05 + 0.1}s` }">✦</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.doodle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.doodle:focus-visible {
  outline: 2px solid var(--sp-primary);
  outline-offset: 4px;
  border-radius: 999px;
}
.doodle__badge {
  position: relative;
  z-index: 2;
  transition: transform 0.6s cubic-bezier(.34, 1.56, .64, 1);
}
.doodle--celebrating .doodle__badge {
  transform: scale(1.85);
  animation: dd-celebrate-wobble 2.4s ease-in-out infinite;
}

/* Idle ambient life — subtle, always on, invites the click. */
.doodle__idle-halo {
  position: absolute;
  inset: 8%;
  z-index: 0;
  border-radius: 999px;
  border: 1px solid rgba(var(--sp-primary-rgb), 0.35);
  animation: dd-idle-breathe 3.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes dd-idle-breathe {
  0%, 100% { opacity: 0.18; transform: scale(0.96); }
  50%      { opacity: 0.42; transform: scale(1.08); }
}
.doodle__idle-shimmer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
}
.doodle__idle-shimmer::before {
  content: '';
  position: absolute;
  top: -20%;
  left: -60%;
  width: 40%;
  height: 140%;
  background: linear-gradient(115deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  transform: skewX(-18deg);
  animation: dd-idle-sweep 4.8s ease-in-out infinite;
  animation-delay: 1.2s;
}
@keyframes dd-idle-sweep {
  0%, 18% { left: -60%; opacity: 0; }
  20%     { opacity: 0.9; }
  38%, 100% { left: 130%; opacity: 0; }
}
.doodle__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: visible;
}

/* Hover caption, Google-Doodle style: hidden until the badge is hovered. */
.doodle__caption {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-dim);
  background: var(--sp-bg-2);
  border: 1px solid var(--sp-border);
  border-radius: 999px;
  padding: 3px 10px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.doodle:hover .doodle__caption {
  opacity: 1;
}
.doodle-caption-fade-enter-active,
.doodle-caption-fade-leave-active { transition: opacity 0.2s ease; }
.doodle-caption-fade-enter-from,
.doodle-caption-fade-leave-to { opacity: 0; }

.doodle-fade-enter-active,
.doodle-fade-leave-active { transition: opacity 0.5s ease; }
.doodle-fade-enter-from,
.doodle-fade-leave-to { opacity: 0; }

/* "Click me" side hint — desktop: floats beside the badge. */
.doodle__hint {
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  margin-left: 14px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--sp-text);
  background: var(--sp-bg-2);
  border: 1px solid var(--sp-border-hover);
  border-radius: 999px;
  padding: 7px 14px 7px 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.doodle__hint::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -5px;
  width: 9px;
  height: 9px;
  transform: translateY(-50%) rotate(45deg);
  background: var(--sp-bg-2);
  border-left: 1px solid var(--sp-border-hover);
  border-bottom: 1px solid var(--sp-border-hover);
}
.doodle__hint-sparkle {
  display: inline-block;
  animation: dd-twinkle 1.3s ease-in-out infinite;
}
@media (max-width: 640px) {
  /* Mobile: not enough room to the side, so it drops below instead. */
  .doodle__hint {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-left: 0;
    margin-top: 14px;
  }
  .doodle__hint::before {
    top: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    border-left: none;
    border-bottom: none;
    border-top: 1px solid var(--sp-border-hover);
    border-right: 1px solid var(--sp-border-hover);
  }
}
.doodle-hint-fade-enter-active,
.doodle-hint-fade-leave-active { transition: opacity 0.3s ease; }
.doodle-hint-fade-enter-from,
.doodle-hint-fade-leave-to { opacity: 0; }

/* --- Celebration: 10 seconds of "the logo got excited" --- */

/* A big, soft, organically-morphing blob behind the badge — this is
   what carries the "large and curvy" feel, since the badge's own shape
   stays intact and just scales up on top of it. */
.doodle__blob {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 260%;
  height: 260%;
  transform: translate(-50%, -50%);
  z-index: 0;
  background: conic-gradient(from 0deg, var(--doodle-c1), var(--doodle-c2), var(--doodle-c1));
  opacity: 0.28;
  filter: blur(2px);
  animation: dd-blob-morph 3.4s ease-in-out infinite, dd-blob-spin 10s linear infinite, dd-blob-in 0.5s cubic-bezier(.22, .61, .36, 1) both;
  pointer-events: none;
}
@keyframes dd-blob-morph {
  0%, 100% { border-radius: 42% 58% 63% 37% / 45% 41% 59% 55%; }
  25%      { border-radius: 60% 40% 45% 55% / 55% 60% 40% 45%; }
  50%      { border-radius: 38% 62% 55% 45% / 62% 38% 62% 38%; }
  75%      { border-radius: 55% 45% 38% 62% / 40% 55% 45% 60%; }
}
@keyframes dd-blob-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes dd-blob-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
  to   { opacity: 0.28; transform: translate(-50%, -50%) scale(1); }
}

@keyframes dd-celebrate-wobble {
  0%, 100% { transform: scale(1.85) rotate(-4deg); }
  50%      { transform: scale(1.98) rotate(4deg); }
}

/* Confetti burst — fires once per click, particles fan out from center
   and fade as they go. */
.doodle__confetti {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}
.dd-confetti-bit {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 2px;
  animation: dd-confetti-burst 1.3s cubic-bezier(.16, .84, .44, 1) both;
}
@keyframes dd-confetti-burst {
  0%   { opacity: 0; transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(0.4); }
  12%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) rotate(calc(340deg * var(--spin, 1))) scale(1); }
}

/* Shockwave ring — one expanding pulse per confetti beat. */
.doodle__shockwaves {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.dd-shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30%;
  height: 30%;
  border-radius: 999px;
  border: 1.5px solid var(--doodle-c2);
  transform: translate(-50%, -50%) scale(1);
  animation: dd-shockwave-expand 1.1s cubic-bezier(.16, .84, .44, 1) both;
}
@keyframes dd-shockwave-expand {
  0%   { opacity: 0.55; transform: translate(-50%, -50%) scale(0.6); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(3.4); }
}

/* Continuous sparkle field — drifts/twinkles for the whole celebration,
   keeping the quiet stretches between confetti beats feeling alive. */
.doodle__sparkle-field {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.dd-field-sparkle {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: radial-gradient(circle, #fff 0%, var(--doodle-c1) 70%, transparent 100%);
  animation: dd-field-twinkle 1.8s ease-in-out infinite, dd-field-drift 6s ease-in-out infinite;
}
@keyframes dd-field-twinkle {
  0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(0.5); }
  50%      { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
}
@keyframes dd-field-drift {
  0%, 100% { margin: 0 0; }
  50%      { margin: -6px 4px; }
}

/* Big curvy name in a chunky display font, replacing the little hover
   caption for the duration of the celebration — each letter pops in on
   its own stagger rather than the whole word appearing at once. */
.doodle__celebrate-name {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  white-space: nowrap;
  font-family: 'Fredoka', 'Poppins', ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.01em;
  filter: drop-shadow(0 2px 14px rgba(var(--sp-primary-rgb), 0.45));
  z-index: 4;
}
.dd-letter {
  display: inline-block;
  background: linear-gradient(120deg, var(--doodle-c1), var(--doodle-c2), var(--doodle-c1));
  background-size: 220% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0;
  animation: dd-letter-pop 0.55s cubic-bezier(.34, 1.56, .64, 1) both, dd-name-shimmer 2.6s linear infinite, dd-letter-bob 2s ease-in-out infinite;
}
.dd-sparkle {
  display: inline-block;
  margin-left: 2px;
  color: var(--doodle-c2);
  -webkit-text-fill-color: var(--doodle-c2);
  opacity: 0;
  animation: dd-letter-pop 0.4s cubic-bezier(.34, 1.56, .64, 1) both, dd-twinkle 1.1s ease-in-out infinite;
}
@keyframes dd-letter-pop {
  0%   { opacity: 0; transform: translateY(10px) scale(0.5) rotate(-10deg); }
  60%  { opacity: 1; transform: translateY(-2px) scale(1.15) rotate(3deg); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
}
@keyframes dd-name-shimmer {
  0%   { background-position: 0% center; }
  100% { background-position: 220% center; }
}
@keyframes dd-letter-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}

/* Fireworks */
.dd-firework {
  transform-origin: 50px 50px;
  animation: dd-firework-pulse 2.2s ease-in-out infinite;
}
@keyframes dd-firework-pulse {
  0%, 100% { opacity: 0.25; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1.15); }
}

/* Hearts */
.dd-heart {
  animation: dd-heart-float 3.6s ease-in infinite;
  opacity: 0;
}
@keyframes dd-heart-float {
  0% { opacity: 0; transform: translateY(0) scale(0.4); }
  15% { opacity: 0.9; }
  85% { opacity: 0.5; }
  100% { opacity: 0; transform: translateY(-70px) scale(0.65); }
}

/* Holi spatter */
.dd-spatter {
  animation: dd-spatter-pulse 2.6s ease-in-out infinite;
  transform-origin: center;
}
@keyframes dd-spatter-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* Eid crescent + stars */
.dd-crescent-glow {
  animation: dd-glow-pulse 3s ease-in-out infinite;
  transform-origin: 50px 50px;
}
@keyframes dd-glow-pulse {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; filter: drop-shadow(0 0 3px var(--doodle-c2)); }
}
.dd-twinkle {
  animation: dd-twinkle 2.4s ease-in-out infinite;
  transform-origin: center;
}
@keyframes dd-twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* Flag */
.dd-flag {
  animation: dd-flag-wave 3.2s ease-in-out infinite;
  transform-origin: 4px 15px;
}
@keyframes dd-flag-wave {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

/* Diyas */
.dd-diya-flame {
  animation: dd-diya-flicker 1.1s ease-in-out infinite;
  transform-origin: center;
}
@keyframes dd-diya-flicker {
  0%, 100% { opacity: 0.7; transform: scale(0.85) translateY(0); }
  50% { opacity: 1; transform: scale(1.15) translateY(-0.5px); }
}

/* Halloween bats */
.dd-bat {
  animation: dd-bat-fly 5s linear infinite;
  opacity: 0;
}
@keyframes dd-bat-fly {
  0% { opacity: 0; transform: translate(-10px, 60px) scale(0.9); }
  10% { opacity: 0.9; }
  50% { transform: translate(60px, 10px) scale(1.05); }
  90% { opacity: 0.9; }
  100% { opacity: 0; transform: translate(110px, 40px) scale(0.9); }
}

/* Snow */
.dd-snow {
  animation-name: dd-snow-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes dd-snow-fall {
  0% { opacity: 0; transform: translateY(-4px); }
  10% { opacity: 0.9; }
  100% { opacity: 0; transform: translateY(104px); }
}

/* Olympic rings */
.dd-rings {
  transform-origin: 50px 50px;
  animation: dd-rings-spin 12s linear infinite;
}
@keyframes dd-rings-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* World Cup ball orbit */
.dd-ball-orbit {
  transform-origin: 50px 50px;
  animation: dd-ball-spin 4s linear infinite;
}
@keyframes dd-ball-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Raksha Bandhan threads */
.dd-rakhi {
  animation: dd-rakhi-sway 2.8s ease-in-out infinite;
}
@keyframes dd-rakhi-sway {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
}

@media (prefers-reduced-motion: reduce) {
  .doodle__overlay *,
  .doodle__blob,
  .doodle__badge,
  .doodle__idle-halo,
  .doodle__idle-shimmer::before,
  .dd-confetti-bit,
  .dd-shockwave,
  .dd-field-sparkle,
  .dd-letter,
  .doodle__celebrate-name,
  .doodle__hint-sparkle,
  .dd-sparkle { animation: none !important; }
  .dd-letter, .dd-sparkle { opacity: 1 !important; }
  .doodle--celebrating .doodle__badge { transform: scale(1.4); }
}
</style>
