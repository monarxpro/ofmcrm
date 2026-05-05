// OFM CRM — Shared Sidebar & Layout
// Include this script in every CRM page

const TRANSLATIONS = {
  en: {
    analytics: 'Analytics', dashboard: 'Dashboard', accountsOverview: 'Accounts Overview',
    accountInsights: 'Account Insights', trafficMetrics: 'Traffic Metrics',
    teamPerformance: 'Team Performance', chattingMetrics: 'Chatting Metrics',
    chattingShifts: 'Chatting Shifts', messageTracker: 'Message Tracker',
    messageGuard: 'Message Guard', messageTemplates: 'Message Templates',
    automations: 'Automations', autoMessages: 'Auto Messages',
    massMessages: 'Mass Messages', dynamicLists: 'Dynamic Lists',
    fanRetention: 'Fan Retention', mediaHub: 'Media Hub',
    models: 'Models', modelCards: 'Model Cards', knowledgeBase: 'Knowledge Base',
    organization: 'Organization', teamMembers: 'Team Members', settings: 'Settings',
    myProfile: 'My Profile', rolesAccess: 'Roles & Access', tgPosting: 'TG Group Posting',
    fanvueManagement: 'Fanvue Management', aiChat: 'AI Chat', logout: 'Logout',
  },
  ru: {
    analytics: 'Аналитика', dashboard: 'Дашборд', accountsOverview: 'Обзор аккаунтов',
    accountInsights: 'Инсайты', trafficMetrics: 'Метрики трафика',
    teamPerformance: 'Команда', chattingMetrics: 'Метрики чата',
    chattingShifts: 'Смены чаттеров', messageTracker: 'Трекер сообщений',
    messageGuard: 'Защита сообщений', messageTemplates: 'Шаблоны',
    automations: 'Автоматизация', autoMessages: 'Авто-сообщения',
    massMessages: 'Массовая рассылка', dynamicLists: 'Динамические листы',
    fanRetention: 'Удержание фанов', mediaHub: 'Медиа-хаб',
    models: 'Модели', modelCards: 'Карточки моделей', knowledgeBase: 'База знаний',
    organization: 'Организация', teamMembers: 'Участники команды', settings: 'Настройки',
    myProfile: 'Мой профиль', rolesAccess: 'Роли и доступ', tgPosting: 'Постинг в группы Telegram',
    fanvueManagement: 'Управление Fanvue', aiChat: 'AI Чат', logout: 'Выйти',
  }
};

const NAV = [
  {
    section: 'analytics',
    items: [
      { key: 'dashboard', href: 'dashboard.html', icon: 'bar-chart' },
      { key: 'accountsOverview', href: 'accounts.html', icon: 'clock', badge: 'Beta' },
      { key: 'accountInsights', href: 'insights.html', icon: 'trend' },
      { key: 'trafficMetrics', href: 'traffic.html', icon: 'traffic', badge: 'Beta' },
    ]
  },
  {
    section: 'teamPerformance',
    items: [
      { key: 'chattingMetrics', href: 'chatting-metrics.html', icon: 'user' },
      { key: 'chattingShifts', href: 'chatting-shifts.html', icon: 'calendar' },
      { key: 'messageTracker', href: 'message-tracker.html', icon: 'list' },
      { key: 'messageGuard', href: 'message-guard.html', icon: 'shield', badge: 'Beta' },
      { key: 'messageTemplates', href: 'message-templates.html', icon: 'template' },
    ]
  },
  {
    section: 'automations',
    items: [
      { key: 'aiChat', href: 'ai-chat.html', icon: 'ai', badge: 'New' },
      { key: 'autoMessages', href: 'auto-messages.html', icon: 'chat' },
      { key: 'massMessages', href: 'mass-messages.html', icon: 'mass' },
      { key: 'dynamicLists', href: 'dynamic-lists.html', icon: 'lock' },
      { key: 'fanRetention', href: 'fan-retention.html', icon: 'star' },
      { key: 'tgPosting', href: 'tg-posting.html', icon: 'tg' },
      { key: 'mediaHub', href: 'media-hub.html', icon: 'grid' },
    ]
  },
  {
    section: 'models',
    items: [
      { key: 'modelCards', href: 'model-cards.html', icon: 'card', badge: 'New' },
      { key: 'knowledgeBase', href: 'knowledge-base.html', icon: 'book' },
    ]
  },
  {
    section: 'organization',
    items: [
      { key: 'teamMembers', href: 'team.html', icon: 'team' },
      { key: 'rolesAccess', href: 'roles.html', icon: 'shield' },
      { key: 'settings', href: 'settings.html', icon: 'settings' },
    ]
  },
];

const BOTTOM_NAV = [
  { key: 'myProfile', href: 'profile.html', icon: 'profile' },
];

const ICONS = {
  'bar-chart': `<svg viewBox="0 0 16 16" fill="none"><rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor"/><rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor"/><rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor"/></svg>`,
  'clock': `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 4v4l3 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'trend': `<svg viewBox="0 0 16 16" fill="none"><path d="M2 12l4-5 3 3 5-7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'traffic': `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 8h2m10 0h2M8 1v2m0 10v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'link': `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'file': `<svg viewBox="0 0 16 16" fill="none"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3"/><path d="M6 6h4M6 9h4M6 12h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'user': `<svg viewBox="0 0 16 16" fill="none"><path d="M2 14s0-4 6-4 6 4 6 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/></svg>`,
  'calendar': `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 3V1M11 3V1M2 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'list': `<svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'shield': `<svg viewBox="0 0 16 16" fill="none"><path d="M8 2L2 5v4c0 3 2.5 5.5 6 6.5C14 14.5 14 9 14 9V5L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  'template': `<svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h6M3 12h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'chat': `<svg viewBox="0 0 16 16" fill="none"><path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V4z" stroke="currentColor" stroke-width="1.3"/></svg>`,
  'mass': `<svg viewBox="0 0 16 16" fill="none"><path d="M1 5h14M1 9h14M5 5V1M11 5V1M5 15v-4M11 15v-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'lock': `<svg viewBox="0 0 16 16" fill="none"><path d="M2 5h12v7a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM5 5V3a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3"/></svg>`,
  'star': `<svg viewBox="0 0 16 16" fill="none"><path d="M8 2l1.8 3.6L14 6.3l-3 2.9.7 4.1L8 11.1l-3.7 2.2.7-4.1-3-2.9 4.2-.7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  'grid': `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>`,
  'card': `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="7" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 13s.5-2.5 4-2.5S12 13 12 13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'book': `<svg viewBox="0 0 16 16" fill="none"><path d="M2 3h12M2 7h8M2 11h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'team': `<svg viewBox="0 0 16 16" fill="none"><path d="M2 14s0-4 6-4 6 4 6 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M13 7v4M11 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'settings': `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'info': `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 7v4M8 5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'changelog': `<svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM1 4h14" stroke="currentColor" stroke-width="1.3"/><path d="M6 2h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'profile': `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M2 14s0-4 6-4 6 4 6 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  'tg': `<svg viewBox="0 0 16 16" fill="none"><path d="M14 2L1 7l5 2 2 5 2-3 4 3L14 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  'ai': `<svg viewBox="0 0 16 16" fill="none"><path d="M8 2a2 2 0 012 2v1h1a2 2 0 010 4h-1v1a2 2 0 01-4 0v-1H5a2 2 0 010-4h1V4a2 2 0 012-2z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>`,
  'chevron': `<svg viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  'bell': `<svg viewBox="0 0 16 16" fill="none"><path d="M8 2a5 5 0 015 5v2l1.5 2.5h-13L3 9V7a5 5 0 015-5zM6 13.5a2 2 0 004 0" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  'search': `<svg viewBox="0 0 16 16" fill="none"><path d="M6 2a4 4 0 104 4 4 4 0 00-4-4z" stroke="currentColor" stroke-width="1.3"/><path d="M14 14l-3.5-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
};

// Get current page filename
function getCurrentPage() {
  return window.location.pathname.split('/').pop() || 'dashboard.html';
}

// Get language from localStorage
function getLang() {
  return localStorage.getItem('ofmcrm_lang') || 'en';
}

function setLang(l) {
  localStorage.setItem('ofmcrm_lang', l);
  window.location.reload();
}

function t(key) {
  return TRANSLATIONS[getLang()][key] || key;
}

function renderBadge(badge) {
  if (!badge) return '';
  const cls = badge === 'New' ? 'nav-badge new' : 'nav-badge';
  return `<span class="${cls}">${badge}</span>`;
}

function renderNavItem(item) {
  const current = getCurrentPage();
  const isActive = current === item.href;
  return `
    <a class="nav-item${isActive ? ' active' : ''}" href="${item.href}" data-label="${t(item.key)}">
      ${ICONS[item.icon] || ''}
      <span>${t(item.key)}</span>
      ${renderBadge(item.badge)}
    </a>
  `;
}

function renderSection(section) {
  return `
    <div class="nav-section">
      <div class="nav-label" onclick="toggleSection(this)">
        <span>${t(section.section)}</span>
        ${ICONS['chevron']}
      </div>
      ${section.items.map(renderNavItem).join('')}
    </div>
  `;
}

function toggleSection(label) {
  label.classList.toggle('collapsed');
  let el = label.nextElementSibling;
  while (el && el.classList.contains('nav-item')) {
    el.style.display = label.classList.contains('collapsed') ? 'none' : '';
    el = el.nextElementSibling;
  }
}

function renderSidebar() {
  const collapsed = localStorage.getItem('ofmcrm_sidebar') === 'collapsed';
  return `
    <div class="logo" onclick="toggleSidebar()" title="Toggle sidebar">
      <div class="logo-icon">OFM</div>
      <div class="logo-text">
        <div class="logo-name">OFM CRM</div>
        <div class="logo-sub">${t('fanvueManagement')}</div>
      </div>
      <div class="logo-toggle">
        <svg viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>
    ${NAV.map(renderSection).join('')}
    <div class="sidebar-bottom">
      ${BOTTOM_NAV.map(renderNavItem).join('')}
      <button class="sidebar-logout" onclick="crmLogout ? crmLogout() : null" data-label="${t('logout')}">
        <svg viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>${t('logout')}</span>
      </button>
    </div>
  `;
}

function renderTopbar(title, rightContent = '') {
  const lang = getLang();
  return `
    <div class="topbar-title">${title}</div>
    <div class="topbar-right">
      <div class="lang-switcher">
        <button class="lang-btn${lang === 'en' ? ' active' : ''}" onclick="setLang('en')">EN</button>
        <button class="lang-btn${lang === 'ru' ? ' active' : ''}" onclick="setLang('ru')">RU</button>
      </div>
      <div class="icon-btn">
        ${ICONS['search']}
      </div>
      <div class="icon-btn" style="position:relative;">
        ${ICONS['bell']}
        <div class="notif-dot"></div>
      </div>
      <div class="avatar-name">Pride Agency</div>
      <div class="avatar">PA</div>
      ${rightContent}
    </div>
  `;
}

// Toggle sidebar collapsed state
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isCollapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('ofmcrm_sidebar', isCollapsed ? 'collapsed' : 'expanded');
  // Dispatch event so pages can react
  window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: isCollapsed } }));
}

// Init sidebar
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  if (sidebar) {
    sidebar.innerHTML = renderSidebar();
    // Restore collapsed state
    if (localStorage.getItem('ofmcrm_sidebar') === 'collapsed') {
      sidebar.classList.add('collapsed');
    }
  }
  if (topbar) topbar.innerHTML = renderTopbar(window.PAGE_TITLE || 'OFM CRM', window.TOPBAR_RIGHT || '');
});
