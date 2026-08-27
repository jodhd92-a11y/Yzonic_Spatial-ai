import type { MessageSchema } from '../messageSchema'

const en: MessageSchema = {
  sidebar: {
    newChat: 'New chat',
    searchChats: 'Search chats',
    chats: 'Chats',
    pinned: 'Pinned',
    noChatsFound: 'No chats found',
    noChatsYet: 'No chats yet — start a new one above',
    groupBy: 'Group by',
    date: 'Date',
    none: 'None',
    camera: 'Camera',
    explore: 'Explore',
    products: 'Products',
    expandSidebar: 'Expand sidebar',
    collapseSidebar: 'Collapse sidebar',
  },
  profileMenu: {
    settings: 'Settings',
    language: 'Language',
    guest: 'Guest',
    notSignedIn: 'Not signed in',
  },
  topbar: {
    clickToRename: 'Click to rename',
    chatOptions: 'Chat options',
    shareChat: 'Share chat',
    linkCopied: 'Link copied',
    newChat: 'New chat',
    star: 'Star',
    unstar: 'Unstar',
    rename: 'Rename',
    markRead: 'Mark as read',
    markUnread: 'Mark as unread',
    delete: 'Delete',
    toggleSidebar: 'Toggle sidebar',
  },
  composer: {
    heading: 'What can I help with?',
    // Shown only on the empty/centered composer — one is picked at random
    // each time that screen mounts (see Composer.vue). Real, concrete
    // example tasks (the way Claude/Kimi phrase theirs), not taglines —
    // nothing here should read like a promise about what the product can
    // actually do.
    placeholders: [
      'Summarize this lab report',
      'Explain this drug interaction',
      'Help me think through a differential diagnosis',
      'What does the recent literature say about…',
      'Review this case history with me',
      'Explain this pathology finding in plain terms',
      'Help interpret this imaging result',
      'Draft patient-friendly notes on a diagnosis',
    ],
    // Shown once a conversation has messages — plain and constant, the
    // way Claude/Kimi's docked composer reads once you're mid-chat.
    writeMessage: 'Write a message…',
    sendHint: ' (Ctrl/⌘+Enter to send)',
  },
}

export default en
