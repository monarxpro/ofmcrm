// OFM CRM — Auth Guard v2 (JWT)
(function () {
  const COOKIE_NAME = 'ofmcrm_auth';
  const LOGIN_PAGE  = '/crm/login.html';

  function getCookie(name) {
    const v = document.cookie.split('; ').find(r => r.startsWith(name + '='));
    return v ? decodeURIComponent(v.split('=')[1]) : null;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`;
  }

  function redirectToLogin() {
    document.documentElement.style.visibility = 'hidden';
    window.location.replace(LOGIN_PAGE);
  }

  function checkAuth() {
    const token = getCookie(COOKIE_NAME);
    if (!token) { redirectToLogin(); return null; }

    // JWT: проверяем что токен есть и не пустой
    // Полная проверка идёт на сервере при API запросах
    try {
      // Декодируем payload (средняя часть JWT)
      const parts = token.split('.');
      if (parts.length !== 3) { deleteCookie(COOKIE_NAME); redirectToLogin(); return null; }
      const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      if (!payload.id || !payload.email) { deleteCookie(COOKIE_NAME); redirectToLogin(); return null; }
      // Проверяем exp
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        deleteCookie(COOKIE_NAME); redirectToLogin(); return null;
      }
      return payload;
    } catch(e) {
      deleteCookie(COOKIE_NAME); redirectToLogin(); return null;
    }
  }

  const user = checkAuth();

  if (user) {
    window.CRM_USER = user;
    document.documentElement.style.visibility = '';
  }

  // Глобальный fetch с JWT токеном
  window.apiRequest = async function(url, options = {}) {
    const token = getCookie(COOKIE_NAME);
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    if (res.status === 401) { deleteCookie(COOKIE_NAME); redirectToLogin(); }
    return res;
  };

  window.crmLogout = function () {
    deleteCookie(COOKIE_NAME);
    localStorage.removeItem('ofmcrm_user');
    window.location.replace(LOGIN_PAGE);
  };

  // Проверка каждые 5 минут
  setInterval(function () {
    const t = getCookie(COOKIE_NAME);
    if (!t) redirectToLogin();
  }, 5 * 60 * 1000);

})();
