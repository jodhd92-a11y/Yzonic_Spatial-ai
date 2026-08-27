import type { MessageSchema } from '../messageSchema'

const es: MessageSchema = {
  sidebar: {
    newChat: 'Nuevo chat',
    searchChats: 'Buscar chats',
    chats: 'Chats',
    pinned: 'Fijados',
    noChatsFound: 'No se encontraron chats',
    noChatsYet: 'Aún no hay chats — inicia uno nuevo arriba',
    groupBy: 'Agrupar por',
    date: 'Fecha',
    none: 'Ninguno',
    camera: 'Cámara',
    explore: 'Explorar',
    products: 'Productos',
    expandSidebar: 'Expandir barra lateral',
    collapseSidebar: 'Contraer barra lateral',
  },
  profileMenu: {
    settings: 'Configuración',
    language: 'Idioma',
    guest: 'Invitado',
    notSignedIn: 'Sin iniciar sesión',
  },
  topbar: {
    clickToRename: 'Haz clic para renombrar',
    chatOptions: 'Opciones del chat',
    shareChat: 'Compartir chat',
    linkCopied: 'Enlace copiado',
    newChat: 'Nuevo chat',
    star: 'Destacar',
    unstar: 'Quitar destacado',
    rename: 'Renombrar',
    markRead: 'Marcar como leído',
    markUnread: 'Marcar como no leído',
    delete: 'Eliminar',
    toggleSidebar: 'Alternar barra lateral',
  },
  composer: {
    heading: '¿En qué puedo ayudarte?',
    placeholders: [
      'Resume este informe de laboratorio',
      'Explica esta interacción medicamentosa',
      'Ayúdame a pensar un diagnóstico diferencial',
      'Qué dice la literatura reciente sobre…',
      'Revisa este historial clínico conmigo',
      'Explica este hallazgo patológico en términos simples',
      'Ayúdame a interpretar este resultado de imagen',
      'Redacta notas para el paciente sobre un diagnóstico',
    ],
    writeMessage: 'Escribe un mensaje…',
    sendHint: ' (Ctrl/⌘+Enter para enviar)',
  },
}

export default es
