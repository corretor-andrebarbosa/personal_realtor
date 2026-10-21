const getDevice = () => {
  const ua = navigator.userAgent || '';
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  return 'desktop';
};

export const trackVisit = (page) => {
  if (typeof window === 'undefined') return;
  if (window.location.hostname === 'localhost') return;

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: page || window.location.pathname,
      referrer: document.referrer || null,
      device: getDevice(),
    }),
  }).catch(() => {});
};
