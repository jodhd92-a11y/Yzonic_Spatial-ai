// Shape every locale file must satisfy. Keeping this as the single source
// of truth means TypeScript will flag a locale file the moment it drifts
// (missing key, typo, etc.) instead of that failing silently at runtime.
export interface MessageSchema {
  sidebar: {
    newChat: string
    searchChats: string
    chats: string
    pinned: string
    noChatsFound: string
    noChatsYet: string
    groupBy: string
    date: string
    none: string
    camera: string
    explore: string
    products: string
    expandSidebar: string
    collapseSidebar: string
  }
  profileMenu: {
    settings: string
    language: string
    guest: string
    notSignedIn: string
  }
  topbar: {
    clickToRename: string
    chatOptions: string
    shareChat: string
    linkCopied: string
    newChat: string
    star: string
    unstar: string
    rename: string
    markRead: string
    markUnread: string
    delete: string
    toggleSidebar: string
  }
  composer: {
    heading: string
    placeholders: string[]
    writeMessage: string
    sendHint: string
  }
}
