// OFM CRM — Auth Guard
// Подключить ПЕРВЫМ скриптом на каждой защищённой странице:
// <script src="auth.js"><\/script>

(function () {
  const COOKIE_NAME = 'ofmcrm_auth';
  const LOGIN_PAGE  = 'login.html';

  // ── Helpers ─────────────────────────────────────────────────────────────
  function getCookie(name) {
    const v = document.cookie.split('; ').find(r => r.startsWith(name + '='));
    return v ? decodeURIComponent(v.split('=')[1]) : null;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`;
  }

  function redirectToLogin() {
    // Скрываем страницу до редиректа чтобы не было flash
    document.documentElement.style.visibility = 'hidden';
    window.location.replace(LOGIN_PAGE);
  }

  // ── Validate token ───────────────────────────────────────────────────────
  function checkAuth() {
    const token = getCookie(COOKIE_NAME);

    if (!token) {
      redirectToLogin();
      return null;
    }

    try {
      const data = JSON.parse(atob(token));
      if (!data || !data.login || !data.ts) {
        deleteCookie(COOKIE_NAME);
        redirectToLogin();
        return null;
      }
      return data;
    } catch (e) {
      deleteCookie(COOKIE_NAME);
      redirectToLogin();
      return null;
    }
  }

  // ── Run check immediately (before DOM renders) ───────────────────────────
  const user = checkAuth();

  if (user) {
    // Expose current user globally for sidebar / pages
    window.CRM_USER = user;

    // Make page visible
    document.documentElement.style.visibility = '';
  }

  // ── Logout function (available globally) ─────────────────────────────────
  window.crmLogout = function () {
    deleteCookie(COOKIE_NAME);
    window.location.replace(LOGIN_PAGE);
  };

  // ── Session expiry check (every 5 min) ──────────────────────────────────
  setInterval(function () {
    const t = getCookie(COOKIE_NAME);
    if (!t) {
      redirectToLogin();
    }
  }, 5 * 60 * 1000);

})();
