import type { MessageSchema } from '../messageSchema'

const hi: MessageSchema = {
  sidebar: {
    newChat: 'नई चैट',
    searchChats: 'चैट खोजें',
    chats: 'चैट्स',
    pinned: 'पिन की गई',
    noChatsFound: 'कोई चैट नहीं मिली',
    noChatsYet: 'अभी कोई चैट नहीं — ऊपर से नई चैट शुरू करें',
    groupBy: 'समूह बनाएं',
    date: 'तारीख़',
    none: 'कोई नहीं',
    camera: 'कैमरा',
    explore: 'खोजें',
    products: 'उत्पाद',
    expandSidebar: 'साइडबार खोलें',
    collapseSidebar: 'साइडबार समेटें',
  },
  profileMenu: {
    settings: 'सेटिंग्स',
    language: 'भाषा',
    guest: 'अतिथि',
    notSignedIn: 'साइन इन नहीं है',
  },
  topbar: {
    clickToRename: 'नाम बदलने के लिए क्लिक करें',
    chatOptions: 'चैट विकल्प',
    shareChat: 'चैट साझा करें',
    linkCopied: 'लिंक कॉपी हो गया',
    newChat: 'नई चैट',
    star: 'स्टार करें',
    unstar: 'स्टार हटाएं',
    rename: 'नाम बदलें',
    markRead: 'पढ़ा हुआ चिह्नित करें',
    markUnread: 'अपठित चिह्नित करें',
    delete: 'हटाएं',
    toggleSidebar: 'साइडबार टॉगल करें',
  },
  composer: {
    heading: 'मैं आपकी किस तरह मदद कर सकता हूँ?',
    placeholders: [
      'इस लैब रिपोर्ट का सारांश दें',
      'इस दवा प्रतिक्रिया को समझाएं',
      'डिफरेंशियल डायग्नोसिस सोचने में मदद करें',
      'हाल के शोध में इस बारे में क्या कहा गया है…',
      'इस केस हिस्ट्री की समीक्षा करें',
      'इस पैथोलॉजी फाइंडिंग को सरल शब्दों में समझाएं',
      'इस इमेजिंग रिजल्ट को समझने में मदद करें',
      'निदान पर मरीज़ के लिए आसान नोट्स लिखें',
    ],
    writeMessage: 'एक संदेश लिखें…',
    sendHint: ' (भेजने के लिए Ctrl/⌘+Enter)',
  },
}

export default hi
