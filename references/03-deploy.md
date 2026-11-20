# 03 — Bảo mật khi deploy (Railway · Hostinger · VPS)

---

## 1. Hai cổng bắt buộc

| Cổng | Khi nào | Kiểm gì | Không đạt |
|---|---|---|---|
| **Cổng 1** | Localhost, **trước** deploy | [`04-app-security.md`](04-app-security.md) mục A–D + `scripts/quick-check.sh local` | Còn 1 mục **P0** → sửa, **không deploy** |
| **Cổng 2** | Domain thật, **sau** deploy | Mục 5–6 dưới đây + `scripts/quick-check.sh prod <domain>` | Sửa ngay, chưa báo xong |

Quy trình sửa về sau: sửa ở **localhost** → user duyệt → Cổng 1 → push GitHub → deploy lại → Cổng 2.

⛔ **Cấm bắn gói thử / gói rỗng lên domain đang bán hàng.** Build "thành công" với gói thiếu file
sẽ thay luôn app đang chạy. Cần thử thì tạo subdomain nháp riêng, xong xoá.
⚠️ Gặp 403 Cloudflare thì **dừng**, không bắn lại dồn dập.

---

## 2. Tách code / data: luật gốc cho mọi nhánh

Deploy lại = **ghi đè mã nguồn**. Không bao giờ để database, ảnh upload hay `.env` nằm trong thư
mục bị ghi đè. Sai luật này = mất dữ liệu của khách.

| Thứ | Đặt ở đâu | Vào git? |
|---|---|---|
| **Mã nguồn** | Thư mục deploy (VPS: `/var/www/<app>` · Hostinger: thư mục app · Railway: repo) | ✅ |
| **Database** | Service riêng, **ngoài** thư mục deploy | ❌ |
| **Ảnh upload** | VPS: `/var/data/<app>/uploads` · Hostinger: `/home/<user>/domains/<domain>/uploads` · Railway: **volume** | ❌ |
| **`.env` / khoá** | VPS: `/etc/<app>/.env` · Hostinger + Railway: **Environment Variables** của nền tảng | ❌ **TUYỆT ĐỐI KHÔNG** |
| **Backup / file tạm** | Ngoài thư mục deploy | ❌ |

Bắt buộc đủ 4 việc:
1. `.gitignore` có `.env`, `uploads/`, `*.db`, `node_modules/`, `temp/` (mẫu: [`../templates/gitignore.template`](../templates/gitignore.template)).
2. App đọc thư mục upload qua **biến môi trường** (`UPLOAD_DIR`), trỏ ra ngoài thư mục build.
3. **Migration chạy lệnh riêng** (`prisma migrate deploy`), không dùng reset/drop khi deploy lại.
4. ✅ **Test trước khi báo xong:** upload 1 ảnh → deploy lại 1 lần → ảnh **vẫn còn**, đơn cũ **vẫn còn**.

⚠️ **Gói zip deploy không được chứa `.env`.**

---

## 3. An toàn token deploy (nói thật với user)

- 🔴 **Hostinger API token có quyền ngang tài khoản hosting**: tạo/xoá web, sửa DNS, quản VPS, DB.
  Đối xử như mật khẩu. (Không xem được thẻ thanh toán.)
- **GitHub token quyền `repo`** đọc/ghi được mọi repo của user. Ưu tiên device flow, scope tối thiểu.
- **Railway Project Token** chỉ trong 1 dự án + 1 môi trường.
- ⛔ Cấm hardcode token vào mã · cấm commit · cấm dán vào tài liệu bàn giao, ảnh chụp màn hình, chat.
  Token chỉ nằm trong kho khoá máy user / biến môi trường / GitHub Secrets (`gh secret set`).
- ⛔ Cấm để mật khẩu root, IP, token thật trong file hướng dẫn → dùng `<IP_VPS>`, `<TOKEN>`.
- ✅ **Bàn giao xong → hướng dẫn user thu hồi token:**
  hPanel → **API** → **Revoke** · GitHub → **Settings → Developer settings / Applications** → **Revoke** ·
  Railway → **Account Settings → Tokens** → xoá.

### Nạp khoá sau deploy mà không ai sửa file
Nền tảng không có API ghi biến môi trường (vd Hostinger) → app dựng sẵn 2 đường nạp khoá qua HTTPS:

| Đường | Khi nào | Bảo vệ bằng |
|---|---|---|
| `POST /api/setup` | Lần đầu sau deploy | Token ngẫu nhiên **sinh lúc deploy, chỉ Penny giữ** (không commit), **hết hạn 30 phút + dùng 1 lần rồi khoá vĩnh viễn** |
| `POST /api/admin/secrets` | Mọi lần sau (xoay khoá, thêm webhook secret) | Phiên đăng nhập admin |

App đọc cấu hình từ **thư mục lưu trữ ngoài thư mục code** (`STORAGE_DIR`, mặc định `~/<app>-storage`).

---

## 4. VPS: khoá máy chủ

```
ssh root@<IP> -p <cổng>
→ cài Node LTS · PM2 · Nginx · Certbot · DB
→ Nginx reverse proxy 80/443 → 127.0.0.1:3000   (app không nghe trực tiếp ra ngoài)
→ certbot --nginx -d <domain> -d www.<domain>   (SSL tự gia hạn)
→ ufw allow 22,80,443 ; ufw enable
→ gắn SSH key → /etc/ssh/sshd_config:
     PasswordAuthentication no
     PermitRootLogin prohibit-password
→ Nginx: thư mục uploads chỉ phục vụ file tĩnh, KHÔNG thực thi .php/.js
```

Mật khẩu root chỉ dùng để cài lần đầu. Bàn giao xong khuyên user **đổi mật khẩu root**.

---

## 5. Hạ tầng sau deploy

| # | Mục | Đạt khi | Ưu tiên |
|---|---|---|---|
| E1 | **HTTPS + chuyển hướng ép** | `http://` → 301/308 sang `https://`; chứng chỉ hợp lệ; không mixed content | **P0** |
| E2 | **`/admin` + `/api` noindex** | `X-Robots-Tag: noindex`; `robots.txt` có `Disallow: /admin` và `/api` | **P0** |
| E3 | **Security headers** | `Strict-Transport-Security` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `X-Frame-Options: SAMEORIGIN` (admin: `DENY`) · `Permissions-Policy` · **không** còn `X-Powered-By`. Mẫu: [`../templates/security-headers.js`](../templates/security-headers.js) | P1 |
| E3b | Khu admin không cache | `/admin`: `Cache-Control: no-store` | P1 |
| E4 | Không lộ chi tiết lỗi | Lỗi 500 chỉ hiện thông báo chung, không stack trace, không đường dẫn máy chủ | **P0** |
| E5 | VPS khoá SSH đúng | Mục 4 | **P0** |
| E6 | **DB không mở ra Internet** | Cổng DB không public. Hostinger: danh sách remote connection **rỗng**, không có `%`. Cần sửa dữ liệu thì mở đúng IP mình, xong đóng ngay | **P0** |
| E7 | **Sao lưu** | Bật backup DB hằng ngày (Railway/Hostinger có sẵn) hoặc cron `pg_dump`/`mysqldump`. **Ảnh upload cũng phải được backup.** Thử khôi phục 1 lần | P1 |
| E8 | Domain thật | `PUBLIC_URL`/canonical không còn `localhost` | **P0** |
| E9 | Có đường quay lại | Deploy hỏng thì rollback thế nào, mất bao lâu | P1 |

🟢 **Content-Security-Policy:** làm sau khi trang ổn định, test kỹ từng trang. CSP sai là vỡ giao diện.

---

## 6. Lệnh kiểm sau deploy

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://<domain>/          # 301 → https
curl -sI https://<domain>/ | grep -iE "strict-transport|x-content-type|x-frame|referrer-policy|permissions-policy|x-powered"
curl -sI https://<domain>/admin | grep -iE "x-frame|x-robots|cache-control"
curl -s https://<domain> | grep -ciE "PAYOS_|GOCSPX-|AIza|ghp_|sk-|localhost"     # phai = 0
```

Hoặc chạy gộp: `bash scripts/quick-check.sh prod <domain>`.
