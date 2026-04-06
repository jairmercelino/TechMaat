/**
 * TechMaat Cookie Consent Banner (AVG/GDPR)
 * Include via <script src="cookies.js" defer></script>
 */
(function() {
  if (localStorage.getItem('tm_cookies_accepted')) return;

  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#003082;color:white;padding:16px 24px;font-family:Manrope,sans-serif;font-size:14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -2px 12px rgba(0,0,0,0.15);';

  banner.innerHTML = '<p style="margin:0;flex:1;min-width:250px;line-height:1.6;">' +
    'Wij gebruiken cookies om de website te laten functioneren en om uw ervaring te verbeteren. ' +
    'Lees meer in ons <a href="privacy.html" style="color:#ff6600;text-decoration:underline;">privacybeleid</a>.' +
    '</p>' +
    '<div style="display:flex;gap:8px;flex-shrink:0;">' +
    '<button id="cookie-decline" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:white;padding:8px 20px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;font-family:Manrope,sans-serif;">Alleen noodzakelijk</button>' +
    '<button id="cookie-accept" style="background:#ff6600;border:none;color:white;padding:8px 20px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;font-family:Manrope,sans-serif;">Akkoord</button>' +
    '</div>';

  document.body.appendChild(banner);

  document.getElementById('cookie-accept').addEventListener('click', function() {
    localStorage.setItem('tm_cookies_accepted', 'all');
    banner.remove();
  });

  document.getElementById('cookie-decline').addEventListener('click', function() {
    localStorage.setItem('tm_cookies_accepted', 'essential');
    banner.remove();
  });
})();
