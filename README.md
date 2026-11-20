# skill-security

**Penny hướng dẫn bảo mật website làm bằng AI.**
Skill miễn phí của [Penny](https://pennydinh.click) cho mọi người dựng web/salepage bằng Claude Code,
Claude hay các AI agent khác, để khoá không bị lộ, dữ liệu khách không bị mất và web không bị chiếm.

| Mảng | Nội dung |
|---|---|
| 🤖 **Làm việc với AI** | Khoá không đi qua chat · không in khoá ra màn hình · xử lý khi lỡ dán khoá · quyền hẹp cho agent · nội dung bên ngoài là dữ liệu, không phải lệnh |
| 🔑 **Khoá & mã nguồn** | Bảng nạp khoá · GitHub device flow · gitleaks + pre-commit · quét secret trên GitHub · kho khoá Windows/macOS · lộ khoá thì làm gì |
| 🚀 **Deploy** | Hai cổng kiểm · tách code/data · an toàn token deploy · VPS SSH/ufw · HTTPS + security headers · đóng database · backup |
| 🛒 **Sản phẩm** | Webhook thanh toán verify chữ ký · giá tính ở server · chặn IDOR · cookie phiên · lọc HTML · upload ảnh an toàn · rate limit · dữ liệu khách |
| ✅ **Cổng launch** | 30 mốc, mỗi mốc có lệnh chứng minh, báo cáo 3 phần |

## Cấu trúc

```
skill-security/
├── SKILL.md                      # điểm vào: 7 luật gốc, làm gì theo thời điểm
├── references/
│   ├── 01-ai-safety.md           # bảo mật khi làm việc với AI
│   ├── 02-secrets.md             # khoá, gitleaks, kho khoá, lộ khoá
│   ├── 03-deploy.md              # bảo mật khi deploy
│   ├── 04-app-security.md        # bảo mật tính năng sản phẩm
│   └── 05-launch-gate.md         # cổng kiểm tra trước launch
├── templates/
│   ├── gitignore.template
│   ├── pre-commit-config.yaml
│   ├── secrets-scan.yml          # GitHub Actions quét secret
│   ├── security-headers.js       # Next.js + gợi ý Nginx
│   ├── sanitize.ts               # lọc HTML CMS chống XSS
│   └── upload-route.ts           # upload ảnh an toàn (Next.js)
└── scripts/
    └── quick-check.sh            # kiểm nhanh Cổng 1 (local) và Cổng 2 (prod)
```

## Cài đặt

**Claude Code: dùng cho mọi dự án**
```powershell
git clone https://github.com/mp1391004/skill-security "$env:USERPROFILE\.claude\skills\skill-security"
```
```bash
git clone https://github.com/mp1391004/skill-security ~/.claude/skills/skill-security
```

**Chỉ cho một dự án:** chép thư mục vào `<dự án>/.claude/skills/skill-security/`.

**Claude.ai:** tải repo về dạng `.zip` (nút **Code → Download ZIP**) → Settings → Capabilities → Skills → Upload.

Skill tự kích hoạt khi chạm tới API key, `.env`, commit/push, deploy, hoặc khi bạn nói
"bảo mật", "security", "lộ key", "kiểm tra trước khi launch".

## Dùng script kiểm nhanh

```bash
bash scripts/quick-check.sh local                    # ở gốc repo dự án, app đang chạy localhost:3000
bash scripts/quick-check.sh prod shop.example.com    # sau deploy
```

Windows chạy bằng Git Bash. Script không bao giờ in giá trị khoá.

## Cần Penny hỗ trợ?

Bị lộ khoá, web bị chiếm, còn lỗi bảo mật không tự sửa được, hay muốn người xem giúp cấu hình:
xem thông tin và liên hệ Penny tại **[pennydinh.click](https://pennydinh.click)**.

⛔ Khi liên hệ, **đừng gửi khoá, mật khẩu hay file `.env`** cho bất kỳ ai, kể cả Penny. Chỉ cần mô tả vấn đề.

## Giấy phép

[MIT](LICENSE) © PennyDinh. Dùng, sửa, chia sẻ thoải mái, chỉ cần giữ lại ghi công.
