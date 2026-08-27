export type Role = 'user' | 'assistant' | 'system'

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  /** Object URL for local preview; real uploads would carry a remote url too. */
  previewUrl?: string
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
  /** True while tokens are still streaming in. */
  streaming?: boolean
  attachments?: Attachment[]
  /** Set if generation failed or was stopped early. */
  error?: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  pinned?: boolean
  /** True when the conversation has updates the user hasn't opened yet. */
  unread?: boolean
}

export interface ChatModel {
  id: string
  name: string
  vendor: string
  description: string
  contextWindow: string
}
