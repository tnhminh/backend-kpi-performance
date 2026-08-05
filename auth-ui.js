(function installAuthentication() {
  const apiBase = () => {
    const stored = (localStorage.getItem('backend-kpi-api-base') || '').replace(/\/$/, '');
    const localFrontend = /^http:\/\/(localhost|127\.0\.0\.1):(5174|5175)$/.test(stored);
    if (localFrontend || (!stored && ['localhost', '127.0.0.1'].includes(location.hostname))) {
      const backend = `http://${location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:8788`;
      localStorage.setItem('backend-kpi-api-base', backend);
      return backend;
    }
    return stored || 'http://localhost:8788';
  };
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.startsWith(apiBase())) return nativeFetch(input, init);
    const headers = new Headers(init.headers || {});
    headers.delete('x-user-id');
    headers.delete('x-user-role');
    return nativeFetch(input, { ...init, headers, credentials: 'include' });
  };

  function loginOverlay(message = '') {
    let root = document.querySelector('#authOverlay');
    if (!root) {
      root = document.createElement('div');
      root.id = 'authOverlay';
      root.className = 'auth-overlay';
      document.body.appendChild(root);
    }
    root.innerHTML = `<form class="auth-card" id="loginForm"><div class="auth-mark">KPI</div><h1>Đăng nhập hệ thống</h1><p>Dùng email và mật khẩu do Admin cấp.</p><small class="auth-api-hint">Backend: ${apiBase()}</small><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Mật khẩu<input name="password" type="password" autocomplete="current-password" required></label><button class="btn btn-primary" type="submit">Đăng nhập</button><small class="auth-error">${message}</small></form>`;
    root.querySelector('#loginForm').onsubmit = async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button');
      button.disabled = true;
      button.textContent = 'Đang đăng nhập...';
      const form = new FormData(event.currentTarget);
      try {
        const response = await fetch(`${apiBase()}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
        const text = await response.text();
        let data;
        try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`Backend ${apiBase()} không trả JSON`); }
        if (!response.ok) throw new Error(data.error || 'Không thể đăng nhập');
        activateUser(data.user);
      } catch (error) {
        loginOverlay(error.message);
      }
    };
  }

  function activateUser(user) {
    document.querySelector('#authOverlay')?.remove();
    window.currentRole = user.role;
    localStorage.setItem('backend-kpi-role', user.role);
    localStorage.setItem('backend-kpi-actor-id', user.id);
    const roleSelect = document.querySelector('#roleSelect');
    if (roleSelect) {
      roleSelect.value = user.role;
      roleSelect.disabled = true;
      roleSelect.title = `Vai trò được xác thực: ${user.role}`;
    }
    const actions = document.querySelector('.top-actions');
    if (actions && !actions.querySelector('#logoutButton')) {
      const logout = document.createElement('button');
      logout.id = 'logoutButton';
      logout.className = 'btn btn-ghost';
      logout.textContent = `Đăng xuất · ${user.name || user.email}`;
      logout.onclick = async () => {
        await fetch(`${apiBase()}/api/auth/logout`, { method: 'POST' });
        loginOverlay();
      };
      actions.appendChild(logout);
    }
    window.render?.();
  }

  (async () => {
    try {
      const response = await fetch(`${apiBase()}/api/auth/me`);
      if (!response.ok) throw new Error();
      activateUser((await response.json()).user);
    } catch { loginOverlay(); }
  })();
})();
