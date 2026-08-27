import type { MessageSchema } from '../messageSchema'

const zh: MessageSchema = {
  sidebar: {
    newChat: '新建对话',
    searchChats: '搜索对话',
    chats: '对话',
    pinned: '已置顶',
    noChatsFound: '未找到对话',
    noChatsYet: '暂无对话 — 点击上方开始新对话',
    groupBy: '分组方式',
    date: '日期',
    none: '不分组',
    camera: '相机',
    explore: '探索',
    products: '产品',
    expandSidebar: '展开侧边栏',
    collapseSidebar: '收起侧边栏',
  },
  profileMenu: {
    settings: '设置',
    language: '语言',
    guest: '访客',
    notSignedIn: '未登录',
  },
  topbar: {
    clickToRename: '点击重命名',
    chatOptions: '对话选项',
    shareChat: '分享对话',
    linkCopied: '链接已复制',
    newChat: '新建对话',
    star: '加星标',
    unstar: '取消星标',
    rename: '重命名',
    markRead: '标记为已读',
    markUnread: '标记为未读',
    delete: '删除',
    toggleSidebar: '切换侧边栏',
  },
  composer: {
    heading: '有什么可以帮你的？',
    placeholders: [
      '总结这份化验报告',
      '解释这个药物相互作用',
      '帮我理清鉴别诊断思路',
      '最近的文献对……有什么看法',
      '和我一起回顾这份病例',
      '用通俗的话解释这个病理结果',
      '帮我解读这份影像结果',
      '为患者起草一份诊断说明',
    ],
    writeMessage: '输入消息…',
    sendHint: '（按 Ctrl/⌘+Enter 发送）',
  },
}

export default zh
