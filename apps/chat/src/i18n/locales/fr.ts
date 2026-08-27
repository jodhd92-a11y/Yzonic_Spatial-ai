import type { MessageSchema } from '../messageSchema'

const fr: MessageSchema = {
  sidebar: {
    newChat: 'Nouvelle discussion',
    searchChats: 'Rechercher des discussions',
    chats: 'Discussions',
    pinned: 'Épinglées',
    noChatsFound: 'Aucune discussion trouvée',
    noChatsYet: 'Pas encore de discussion — commencez-en une ci-dessus',
    groupBy: 'Grouper par',
    date: 'Date',
    none: 'Aucun',
    camera: 'Caméra',
    explore: 'Explorer',
    products: 'Produits',
    expandSidebar: 'Développer la barre latérale',
    collapseSidebar: 'Réduire la barre latérale',
  },
  profileMenu: {
    settings: 'Paramètres',
    language: 'Langue',
    guest: 'Invité',
    notSignedIn: 'Non connecté',
  },
  topbar: {
    clickToRename: 'Cliquez pour renommer',
    chatOptions: 'Options de la discussion',
    shareChat: 'Partager la discussion',
    linkCopied: 'Lien copié',
    newChat: 'Nouvelle discussion',
    star: 'Mettre en avant',
    unstar: 'Retirer la mise en avant',
    rename: 'Renommer',
    markRead: 'Marquer comme lu',
    markUnread: 'Marquer comme non lu',
    delete: 'Supprimer',
    toggleSidebar: 'Basculer la barre latérale',
  },
  composer: {
    heading: 'Comment puis-je vous aider ?',
    placeholders: [
      'Résumez ce rapport de laboratoire',
      'Expliquez cette interaction médicamenteuse',
      'Aidez-moi à établir un diagnostic différentiel',
      'Que dit la littérature récente sur…',
      'Passons en revue cet historique de cas',
      'Expliquez ce résultat anatomopathologique simplement',
      "Aidez-moi à interpréter ce résultat d'imagerie",
      'Rédigez des notes pour le patient sur un diagnostic',
    ],
    writeMessage: 'Écrivez un message…',
    sendHint: ' (Ctrl/⌘+Entrée pour envoyer)',
  },
}

export default fr
