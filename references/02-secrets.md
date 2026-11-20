# 02 — Khoá, secret & mã nguồn

---

## 1. Bảng nạp khoá (cách mặc định để lấy khoá của user)

Một trang web nhỏ chạy **trên máy user** (`http://127.0.0.1:3999`), Penny tự bật, tự mở trình duyệt,
dùng xong tự tắt. Với user đây chỉ là "cửa sổ Penny mở ra".

Mỗi khoá là **một dòng**, đủ 4 thứ:

| Thành phần | Ghi chú |
|---|---|
| **Tên tiếng Việt dễ hiểu** | *"Mã nhận tiền chuyển khoản"*, ⛔ không phải `PAYOS_CHECKSUM_KEY` |
| Nút xanh **"Lấy mã ở đây"** | Mở đúng trang, đúng màn hình, kèm 1 dòng chỉ chỗ bấm |
| **Ô dán che sẵn** | Chữ tự thành chấm, có nút 👁 *Hiện* |
| Nút **"Kiểm tra"** | Gọi thật dịch vụ → ✅ *"Kết nối được"* / ❌ *"Mã chưa đúng"* |

User làm 3 động tác mỗi dòng: **bấm nút xanh → copy → dán**, cuối trang bấm **Lưu tất cả**.

**Gom một lần.** Trước khi mở bảng phải chốt xong:
1. Có thu tiền không? → PayOS / Stripe
2. Có báo đơn về điện thoại không? → Telegram
3. Có đăng nhập bằng Google không? → Google OAuth
4. **Đưa trang lên đâu?** → Railway / Hostinger / VPS (hỏi sớm)

```
Còn 4 việc — làm xong bấm Lưu tất cả

☐ Nhận tiền chuyển khoản (PayOS)          3 ô   [Lấy mã ở đây] [Kiểm tra]
☐ Báo đơn về điện thoại (Telegram)        2 ô   [Lấy mã ở đây] [Kiểm tra]
☐ Cho khách đăng nhập bằng Google         2 ô   [Lấy mã ở đây] [Kiểm tra]
☐ Kết nối GitHub để đưa trang lên mạng          [Bấm để kết nối]  ← 1 nút, không copy gì

                    [ Lưu tất cả ]
```

Trong lúc user làm, Penny im lặng chờ. Đóng nhầm cửa sổ → bấm lại link cũ, dòng đã xong vẫn ✅.

### GitHub: không dán token, dùng Device Flow
⛔ Bỏ hẳn cách bắt user tạo `ghp_…` rồi copy.
1. Penny gọi `POST https://github.com/login/device/code` (scope tối thiểu, vd `repo,workflow`) → nhận `user_code`.
2. Bảng hiện mã to, nút **Copy** và nút **"Mở GitHub"**. User dán mã, bấm **Authorize**.
3. Penny poll `POST https://github.com/login/oauth/access_token` → token về **thẳng kho khoá cục bộ**,
   không hiện ra màn hình, không vào chat, không vào log.

Nền tảng chưa có device flow (Railway, Hostinger): ô dán trong bảng + nút "Lấy mã ở đây" + nút Kiểm tra.

### Nghiệm thu Bảng nạp khoá
- [ ] Tự mở được, user không cần gõ địa chỉ
- [ ] Mỗi dòng đủ 4 thành phần, tên hiển thị tiếng Việt
- [ ] Nút Kiểm tra gọi thật dịch vụ (Telegram gửi tin thử · PayOS kiểm khoá · Google thử đăng nhập · AI hỏi 1 câu)
- [ ] Lưu → khoá vào **DB đã mã hoá**; `grep -R` mã nguồn + log không ra giá trị nào
- [ ] GitHub đi bằng device flow, không có ô dán `ghp_`
- [ ] Bảng tự tắt sau khi Lưu; cổng 3999 đã đóng
- [ ] Toàn bộ hội thoại không chứa giá trị khoá nào

---

## 2. Khoá lưu ở đâu

| Loại | Nơi lưu | Đổi về sau |
|---|---|---|
| **Khoá dịch vụ & thông tin liên hệ**: PayOS · Stripe · Telegram token + chat ID · Brevo · Google OAuth · Gemini/AI · số Zalo · link Messenger · hotline | **Database, mã hoá** | `/admin → Cài đặt` → dán lại → **Kiểm tra kết nối** → Lưu. Không đụng file, không deploy lại |
| **Token deploy**: GitHub · Railway · Hostinger | **Kho khoá hệ điều hành** trên máy user (mục 4b), hoặc file quyền `600` **ngoài thư mục dự án** | Bàn giao xong **huỷ luôn** |
| **Chỉ 2 thứ buộc ở biến môi trường**: `DATABASE_URL` · `JWT_SECRET` | Environment Variables của nền tảng / `.env` trên server VPS | `JWT_SECRET` Penny tự sinh 64 ký tự ngẫu nhiên, mỗi dự án một cái |

⛔ **Cấm để khoá dịch vụ chỉ nằm trong `.env`**: user muốn đổi bot Telegram hay hotline lại phải nhờ người khác.
✅ Admin có nút **Kiểm tra kết nối** cạnh mỗi khoá; khoá hiện dạng che (`AIza…9NQx`), chỉ admin đã đăng nhập mới xem.

### Vì sao không bắt user tự sửa `.env`
- Windows: file `.env` không đuôi → hiện bảng "chọn ứng dụng", user tắc ngay.
- Notepad Save → thành **`.env.txt`**, app không đọc được, nhìn y hệt.
- Thừa dấu cách/ngoặc kép là app chết, không có gì báo.
- Sau deploy, `.env` nằm trên máy chủ, không ở máy user nữa.

**Ngoại lệ có kiểm soát:** không bật được bảng thì Penny **tự tạo** `.env` (đủ tên biến + chú thích),
**tự mở** cho user dán, rồi **tự kiểm** tên file, ô trống, dấu thừa và kết nối thật. Kiểm `.env`
đã nằm trong `.gitignore` **trước khi** mở. Cái bị cấm là bắt user tự tìm và tự sửa file.

```powershell
# o nhap an, ghi thang vao .env (Windows)
$v = Read-Host "Dan ma Telegram vao day roi Enter" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($v))
Add-Content -Encoding utf8 .env "TELEGRAM_BOT_TOKEN=$plain"; Remove-Variable v,plain
```
```bash
# macOS / Linux / Git Bash
read -rsp "Dan ma Telegram vao day roi Enter: " v; echo; printf 'TELEGRAM_BOT_TOKEN=%s\n' "$v" >> .env; unset v
```
Chỉ in **tên biến còn trống**: `grep -E '^[A-Z_]+=\s*$' .env | sed 's/=.*//'`

---

## 3. Quét tự động trước mọi commit/push

```bash
gitleaks protect --staged --verbose --redact   # thu sap commit
gitleaks detect --no-banner --redact           # toan bo lich su
git ls-files | grep -E "(^|/)\.env($|\.)" | grep -v "\.env\.example$"   # phai TRONG
```

Chưa cài gitleaks hoặc repo chưa có hook → **dừng việc đang làm**, làm mục 4, xong mới tiếp.
Báo có secret → làm mục 5, không phải xoá file.

Trước `git add`: xem `git status`, **`git add <file cụ thể>`**, tránh `git add -A` khi chưa chắc thư mục sạch.
Repo chứa cấu hình khách để **private**.

---

## 4. Thiết lập lần đầu (Penny tự làm, user không cần hiểu)

### 4a. Cài công cụ
```powershell
# Windows
winget install --id Gitleaks.Gitleaks -e      # hoac: scoop install gitleaks
pip install pre-commit                        # chua co Python: winget install Python.Python.3.12
```
```bash
# macOS
brew install gitleaks pre-commit
```
Kiểm: `gitleaks version` và `pre-commit --version` đều ra số phiên bản.

### 4b. Token deploy cất vào kho khoá hệ điều hành
```powershell
# Windows — SecretManagement (cai 1 lan)
Install-Module Microsoft.PowerShell.SecretManagement, Microsoft.PowerShell.SecretStore -Scope CurrentUser
Register-SecretVault -Name skilla -ModuleName Microsoft.PowerShell.SecretStore -DefaultVault
Set-Secret -Name TENDUAN-railway                                    # hien o nhap an
$env:RAILWAY_TOKEN = Get-Secret -Name TENDUAN-railway -AsPlainText  # nap khi can, khong in ra
```
```bash
# macOS — Keychain
security add-generic-password -s TENDUAN-railway -a "$USER" -w     # hien o nhap an
export RAILWAY_TOKEN=$(security find-generic-password -s TENDUAN-railway -w)
```
Giá trị gõ vào dấu nhắc, **không nằm trên dòng lệnh** nên không vào lịch sử shell.
Không cài được kho khoá → file trong `~/.skilla/` quyền chỉ chủ máy đọc, ngoài thư mục dự án.

### 4c. File bảo vệ, có ngay từ commit đầu tiên
Mẫu sẵn trong [`../templates/`](../templates/):

| File | Mẫu |
|---|---|
| `.gitignore` (thêm, không ghi đè dòng đã có) | [`gitignore.template`](../templates/gitignore.template) |
| `.pre-commit-config.yaml` | [`pre-commit-config.yaml`](../templates/pre-commit-config.yaml) |
| `.github/workflows/secrets-scan.yml` | [`secrets-scan.yml`](../templates/secrets-scan.yml) |

`.env.example` **sinh tự động, chỉ tên biến**, cấm chép tay:
```bash
sed -E 's/=.*/=/' .env | grep -E '^[A-Za-z_]' > .env.example
```
```powershell
(Get-Content .env) -match '^[A-Za-z_]' -replace '=.*','=' | Set-Content -Encoding utf8 .env.example
```

Rồi chạy:
```bash
pre-commit install
gitleaks detect --no-banner --redact
```

Bật thêm trên GitHub: **Settings → Code security → Secret scanning + Push protection**.

---

## 5. Lộ khoá thì tạo khoá mới

Git giữ toàn bộ lịch sử. Khoá đã commit vẫn nằm trong commit cũ, mọi bản clone và fork, kể cả khi
đã xoá file hay chuyển repo sang private.

Đúng thứ tự:
1. **Huỷ khoá cũ + tạo khoá mới** trên trang dịch vụ. Đây là **bước duy nhất thật sự chặn thiệt hại**.
2. **Xem lịch sử sử dụng** của dịch vụ trong khoảng thời gian lộ: có giao dịch/request lạ không.
3. Nạp khoá mới qua Bảng nạp khoá hoặc `/admin → Cài đặt`.
4. Repo còn dùng → dọn lịch sử: `git filter-repo --invert-paths --path .env` rồi force push.
   Báo user: viết lại lịch sử, ai đã clone phải clone lại.
5. Repo **public** → coi như bot đã quét thấy trong vài phút. Bước 1 bắt buộc, bước 4 tuỳ.

⛔ **Không bao giờ** nói với user "xoá file là xong".

Thấy giao dịch/request lạ ở bước 2 → làm xong bước 1, rồi mời user liên hệ Penny tại
[pennydinh.click](https://pennydinh.click) để được hỗ trợ (không gửi khoá khi liên hệ).

| Dịch vụ | Huỷ / tạo lại |
|---|---|
| Telegram bot | @BotFather → `/revoke` → chọn bot → nhận token mới |
| PayOS | my.payos.vn → kênh thanh toán → tạo lại khoá |
| Gemini | aistudio.google.com/app/apikey → xoá khoá cũ → Create API key |
| Anthropic / OpenAI | Console → API keys → xoá khoá cũ → tạo mới |
| Google OAuth | Google Cloud Console → Credentials → Client → Reset secret |
| Brevo | SMTP & API → xoá khoá cũ → tạo mới |
| GitHub | Settings → Applications / Developer settings → Revoke |
| Railway | Account Settings → Tokens → xoá token |
| Hostinger | hPanel → API → Revoke |
| `JWT_SECRET` | Sinh lại 64 ký tự ngẫu nhiên → mọi người đang đăng nhập phải đăng nhập lại |
