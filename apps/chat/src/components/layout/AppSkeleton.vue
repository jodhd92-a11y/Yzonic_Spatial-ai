<script setup lang="ts">
// Full boot-time skeleton — deliberately mirrors the *exact* layout,
// spacing, and sizing of the real sidebar (SidebarBody), topbar (TopBar),
// and the centered "new chat" composer (Composer, centered variant), down
// to matching heights/paddings, so swapping this out for the real DOM once
// chat.hydrated flips true never causes a layout jump.
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
</script>

<template>
  <div class="flex h-full w-full">
    <!-- Sidebar rail — matches SidebarBody's 280px rail exactly. -->
    <aside class="hidden h-full w-[280px] shrink-0 flex-col border-r border-[var(--sp-border)] lg:flex">
      <!-- Header: 60px, wordmark left, icon buttons right -->
      <div class="flex h-[60px] shrink-0 items-center px-4">
        <SkeletonBlock width="86px" height="17px" rounded="4px" />
        <div class="ml-auto flex items-center gap-1">
          <SkeletonBlock width="32px" height="32px" rounded="8px" />
          <SkeletonBlock width="32px" height="32px" rounded="8px" />
        </div>
      </div>

      <!-- New chat button -->
      <div class="shrink-0 px-3 pb-3 pt-2">
        <SkeletonBlock width="100%" height="42px" rounded="12px" />
      </div>

      <!-- Chats label -->
      <div class="mb-1 px-3 pb-1 pt-2">
        <SkeletonBlock width="44px" height="10px" rounded="3px" />
      </div>

      <!-- Conversation rows — same icon + title + timestamp shape as
           ConversationItem, same gap-2.5 px-3 py-2 rhythm. -->
      <div class="min-h-0 flex-1 overflow-hidden px-2">
        <div
          v-for="w in ['62%', '78%', '54%', '70%', '46%', '66%', '58%']"
          :key="w"
          class="flex items-start gap-2.5 rounded-xl px-3 py-2"
        >
          <SkeletonBlock width="14px" height="14px" rounded="4px" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5 pt-[1px]">
            <SkeletonBlock :width="w" height="12px" rounded="3px" />
            <SkeletonBlock width="34%" height="9px" rounded="3px" />
          </div>
        </div>
      </div>

      <!-- Profile row -->
      <div class="shrink-0 border-t border-white/[0.06] px-2 pb-2 pt-1">
        <div class="flex items-center gap-3 py-2 pl-3 pr-3">
          <SkeletonBlock width="28px" height="28px" rounded="999px" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <SkeletonBlock width="60%" height="11px" rounded="3px" />
            <SkeletonBlock width="80%" height="9px" rounded="3px" />
          </div>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Topbar — 56px, border-b, actions top-right -->
      <header class="flex h-14 shrink-0 items-center gap-1 border-b border-[var(--sp-border)]/60 px-3">
        <SkeletonBlock width="120px" height="14px" rounded="4px" class="ml-1" />
        <div class="ml-auto flex items-center gap-1">
          <SkeletonBlock width="30px" height="30px" rounded="8px" />
        </div>
      </header>

      <!-- Centered greeting + composer, matching Composer's `centered` state -->
      <div class="flex flex-1 items-center justify-center px-4">
        <div class="w-full max-w-[640px]">
          <div class="mb-5 flex flex-col items-center text-center">
            <SkeletonBlock width="52px" height="52px" rounded="16px" class="mb-3" />
            <SkeletonBlock width="220px" height="24px" rounded="6px" />
          </div>

          <!-- Composer shell -->
          <div class="rounded-[26px] border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/80 px-5 pb-3 pt-4">
            <SkeletonBlock width="72%" height="14px" rounded="4px" class="mb-4" />
            <div class="flex items-center justify-between">
              <SkeletonBlock width="36px" height="36px" rounded="10px" />
              <div class="flex items-center gap-2">
                <SkeletonBlock width="88px" height="30px" rounded="8px" />
                <SkeletonBlock width="36px" height="36px" rounded="999px" />
              </div>
            </div>
          </div>

          <!-- Suggestion pills -->
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <SkeletonBlock
              v-for="w in ['150px', '175px', '168px', '190px']"
              :key="w"
              :width="w"
              height="34px"
              rounded="999px"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
