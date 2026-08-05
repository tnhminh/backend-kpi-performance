(function installUserAdmin() {
  const api = () => (localStorage.getItem('backend-kpi-api-base') || 'http://127.0.0.1:8788').replace(/\/$/, '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const baseRenderSettings = renderSettings;
  renderSettings = function renderSettingsWithUsers() {
    baseRenderSettings();
    if (currentRole !== 'Admin') return;
    const root = document.querySelector('#settingsRoot');
    if (!root || root.querySelector('.user-admin-panel')) return;
    root.insertAdjacentHTML('beforeend', `<section class="user-admin-panel"><div class="user-admin-head"><div><b>Quản lý tài khoản</b><span>Admin tạo user và cấp quyền đăng nhập cho member/leader.</span></div><button type="button" class="btn btn-ghost" id="reloadUsers">Tải lại</button></div><form id="userCreateForm" class="user-create-form"><input name="id" placeholder="Mã nhân viên" required><input name="displayName" placeholder="Họ tên" required><input name="email" type="email" placeholder="Email" required><input name="team" placeholder="Team"><select name="role"><option>Member</option><option>Leader</option><option>Admin</option></select><input name="password" type="password" minlength="12" placeholder="Mật khẩu ≥ 12 ký tự" required><button class="btn btn-primary">Tạo/cập nhật user</button></form><div id="usersAdminList"><div class="empty">Đang tải user...</div></div></section>`);
    const list = root.querySelector('#usersAdminList');
    const load = async () => {
      try {
        const response = await fetch(`${api()}/api/users`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tải được user');
        list.innerHTML = data.users.length ? `<div class="user-admin-table">${data.users.map(user => `<div class="user-admin-row"><div><b>${esc(user.display_name)}</b><small>${esc(user.email || 'Chưa có email')} · ${esc(user.team || 'Chưa có team')}</small></div><span class="group-tag">${esc(user.role)}</span><button type="button" class="btn btn-ghost user-reset" data-id="${esc(user.id)}" data-name="${esc(user.display_name)}">Đổi mật khẩu</button></div>`).join('')}` : '<div class="empty">Chưa có user.</div>';
        list.querySelectorAll('.user-reset').forEach(button => button.onclick = async () => {
          const password = window.prompt(`Mật khẩu mới cho ${button.dataset.name} (tối thiểu 12 ký tự)`);
          if (!password) return;
          const response = await fetch(`${api()}/api/users/${encodeURIComponent(button.dataset.id)}/password`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
          const result = await response.json();
          toast(response.ok ? 'Đã đổi mật khẩu user' : (result.error || 'Không đổi được mật khẩu'));
        });
      } catch (error) { list.innerHTML = `<div class="empty">${esc(error.message)}</div>`; }
    };
    root.querySelector('#reloadUsers').onclick = load;
    root.querySelector('#userCreateForm').onsubmit = async event => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch(`${api()}/api/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      toast(response.ok ? 'Đã lưu user' : (result.error || 'Không lưu được user'));
      if (response.ok) { event.currentTarget.reset(); load(); }
    };
    load();
  };
})();
