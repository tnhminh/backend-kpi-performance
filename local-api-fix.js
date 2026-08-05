(function migrateLocalBackendApi() {
  const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!localHost) return;
  if (location.hostname === 'localhost' && ['5174', '5175'].includes(location.port)) {
    location.replace(`http://127.0.0.1:${location.port}${location.pathname}${location.search}${location.hash}`);
    return;
  }
  const stored = (localStorage.getItem('backend-kpi-api-base') || '').replace(/\/$/, '');
  const frontendOrigins = [location.origin, 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'];
  if (!stored || frontendOrigins.includes(stored)) {
    localStorage.setItem('backend-kpi-api-base', 'http://127.0.0.1:8788');
    if (typeof renderSettings === 'function') renderSettings();
  }
})();
