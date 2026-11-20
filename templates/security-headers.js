// Security headers cho Next.js — chép phần headers() vào next.config.js / next.config.mjs.
// Chuẩn: references/03-deploy.md mục 5 (E2, E3, E3b). CSP để sau, khi trang đã ổn định.

const common = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const privateArea = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Cache-Control', value: 'no-store' },
];

module.exports = {
  poweredByHeader: false, // bỏ X-Powered-By
  async headers() {
    return [
      { source: '/:path*', headers: common },
      { source: '/admin/:path*', headers: privateArea },
      { source: '/admin', headers: privateArea },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
};

// VPS dùng Nginx thì đặt tương đương trong server { ... }:
//   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
//   add_header X-Content-Type-Options "nosniff" always;
//   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
//   add_header X-Frame-Options "SAMEORIGIN" always;
//   server_tokens off;
//   location /uploads/ { alias /var/data/<app>/uploads/; location ~ \.(php|js|html?)$ { deny all; } }
