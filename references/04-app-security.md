# 04 — Bảo mật sản phẩm (thanh toán · tài khoản · form · upload · dữ liệu khách)

Trang dựng bằng bộ skill có: **tiền của khách** · **dữ liệu cá nhân** (tên, SĐT, email) ·
**trang quản trị** · **khoá API** · **tài khoản người dùng**. Lỗ bảo mật ở đây không phải "trang
xấu" mà là **mất tiền, lộ data khách, bị chiếm trang**.

> 🔴 Chạy ở **Cổng 1** (localhost, trước deploy) — còn 1 mục **P0** chưa đạt → **không deploy**.
> Không hiện bảng này cho user, chỉ báo *"đã kiểm chuẩn bảo mật, đạt"* hoặc *"còn N mục đang sửa"*.
> ⛔ **Cấm tick ✅ mà chưa thật sự thử.**

---

## A. Tiền & thanh toán: nhóm nguy hiểm nhất

| # | Mục | Đạt khi | Ưu tiên |
|---|---|---|---|
| A1 | **Webhook thanh toán verify chữ ký** | Mọi request vào `/api/payos/webhook` (hoặc Stripe/Lemon) **kiểm chữ ký/checksum** trước khi ghi đơn. Không verify = ai cũng giả được tin "đã thanh toán". **Thử: `curl` request giả → bị từ chối.** Đây là việc của Penny (viết code verify bằng Checksum Key + khai URL webhook), không bắt user làm | **P0** |
| A2 | **Giá tính ở server** | Client chỉ gửi **mã gói/ID sản phẩm**; giá lấy từ DB. Nhận `amount` từ trình duyệt = khách sửa devtools mua 1đ. **Thử: sửa giá trong request → server bỏ qua** | **P0** |
| A3 | **Chống ghi đơn trùng** | Webhook gửi lại nhiều lần → không cộng tiền/cấp quyền 2 lần. Khoá theo mã giao dịch | **P0** |
| A4 | **Cấp quyền chỉ khi đã thanh toán** | Không cấp ở bước tạo đơn/redirect thành công, chỉ khi webhook xác nhận | **P0** |
| A5 | Khoá thanh toán chỉ ở server | `PAYOS_*` / `STRIPE_SECRET` không xuất hiện trong mã phía trình duyệt. **Thử: `curl` trang → grep tên khoá → không ra** | **P0** |

## B. Tài khoản & phân quyền

| # | Mục | Đạt khi | Ưu tiên |
|---|---|---|---|
| B1 | **Mọi API riêng tư kiểm ở máy chủ** | Gọi `/api/admin/*` không kèm phiên → **401/403**. **Thử từng route**, không chỉ 1 route. Chỉ route thật sự công khai (đăng nhập, form liên hệ, đếm lượt xem, webhook) mới không kiểm | **P0** |
| B2 | **IDOR: không xem/sửa được dữ liệu người khác** | Mọi truy vấn lọc theo chủ sở hữu (`userId`/`siteId`/`tenantId`). Đọc/sửa/xoá theo id **phải kèm** điều kiện chủ sở hữu. **Thử: đăng nhập user A, đổi ID sang đơn của user B → bị chặn** | **P0** |
| B3 | **Chỉ nhận đúng trường đã khai** | Dữ liệu ghi DB liệt kê từng trường; ⛔ không đổ nguyên `...body`. **Thử: gửi kèm `"role":"admin"`, `"siteId":"<khác>"`, `"price":1` → bản ghi không đổi** | **P0** |
| B4 | Mật khẩu **băm** | bcrypt / argon2 / scrypt / pbkdf2. ⛔ Không lưu thô, không mã hoá 2 chiều | **P0** |
| B5 | **Cookie phiên an toàn** | `HttpOnly` + `Secure` (production) + `SameSite=Lax/Strict` + có hạn dùng. ⛔ Không để token đăng nhập trong `localStorage` | **P0** |
| B6 | `JWT_SECRET` mạnh | ≥ 32 ký tự ngẫu nhiên (khuyên 64), **mỗi dự án một cái**. ⛔ Cấm `secret`/`changeme`/dùng lại | **P0** |
| B7 | **Chống dò mật khẩu admin** | Sai quá 5 lần → khoá tạm/chậm dần. Báo lỗi chung *"email hoặc mật khẩu không đúng"* | P1 |
| B8 | Google OAuth khai đúng | Redirect URI chỉ gồm domain thật + localhost, không wildcard. App đã **Publish** nếu bán thật | P1 |
| B9 | Đăng xuất huỷ phiên thật | Đăng xuất → quay lại `/admin` phải đăng nhập lại | P1 |

```bash
# route nao chua kiem dang nhap (Next.js app router)
for f in $(find app/api -name route.ts); do
  printf "%-45s " "$f"
  grep -qE "requireAdmin|isAdmin|getCurrentUser|auth\(\)" "$f" && echo "co kiem tra" || echo "CONG KHAI"
done
# truy van khong loc chu so huu
grep -rn "findMany\|findFirst\|findUnique\|updateMany\|deleteMany" --include='*.ts' app lib | grep -v "siteId\|userId\|tenantId" | head -30
# do nguyen body vao DB
grep -rn "\.\.\.body\|\.\.\.data\|\.\.\.input" --include='*.ts' app | head
```

## C. Nhập liệu & upload

| # | Mục | Đạt khi | Ưu tiên |
|---|---|---|---|
| C1 | **Lọc HTML phía server trước khi lưu** | Nội dung CMS render bằng `dangerouslySetInnerHTML`/`v-html` đều qua bộ lọc allowlist ([`../templates/sanitize.ts`](../templates/sanitize.ts)). **Thử lưu `<script>alert(1)</script>` và `<img src=x onerror=alert(1)>` → trang không chạy** | **P0** |
| C2 | 🔴 **Không cho upload SVG** | SVG chứa được `<script>` → XSS chiếm phiên admin. Chỉ nhận JPG · PNG · WebP · AVIF · GIF | **P0** |
| C3 | **Kiểm kiểu file thật** | Đọc magic bytes, không tin đuôi/`file.type`. `shell.php` đổi tên `anh.jpg` phải bị chặn. Lưu tên ngẫu nhiên (`randomUUID`), đuôi do server quyết | **P0** |
| C4 | Thư mục upload không chạy được mã | Chỉ phục vụ file tĩnh; nằm ngoài thư mục build ([`03-deploy.md`](03-deploy.md) mục 2) | **P0** |
| C5 | Route upload kiểm quyền + giới hạn 5MB | Chưa đăng nhập → 401. Sai định dạng/quá cỡ → báo lỗi tiếng Việt rõ. Mẫu: [`../templates/upload-route.ts`](../templates/upload-route.ts) | **P0** |
| C6 | **Validate form ở server** | Bắt buộc trường quan trọng · đúng định dạng email/SĐT · **giới hạn độ dài từng ô**. **Thử: thiếu tên → 400; chuỗi 100.000 ký tự → bị từ chối** | **P0** |
| C7 | **Rate limit** | Form lead 5 lần/10 phút · đăng nhập 8 lần/10 phút · API gọi AI/SMS/email 20 lần/10 phút · tracking 120 lần/phút, theo IP + honeypot ẩn trên form. Không có → lead rác, Telegram nổ, đốt tiền API | **P0** |
| C8 | Truy vấn DB tham số hoá | ORM đúng cách; raw query dùng `$1`/`?`. ⛔ Cấm nối chuỗi SQL từ input | **P0** |
| C9 | API trả về tối thiểu | API công khai chỉ trả đúng thứ trang cần: không trả cả bản ghi user, id nội bộ, lỗi lộ cấu trúc DB | P1 |

```bash
grep -rn "dangerouslySetInnerHTML\|v-html\|innerHTML" --include='*.tsx' --include='*.ts' --include='*.vue' app components | head
grep -rn "queryRaw\|executeRaw\|RawUnsafe\|\"SELECT .*\" *+" --include='*.ts' app lib
# thu rate limit: vai lan dau 200, sau do 429. XONG NHO XOA BAN GHI THU.
for i in $(seq 1 7); do curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3000/api/lead \
  -H "Content-Type: application/json" -d '{"name":"test","email":"a@b.com"}'; done; echo
```

## D. Khoá trong sản phẩm

| # | Mục | Đạt khi | Ưu tiên |
|---|---|---|---|
| D0 | Khoá dịch vụ lưu DB **mã hoá**, sửa được trong `/admin` | **Thử: đổi token Telegram → gửi tin thử → về bot mới, không deploy lại** | **P0** |
| D1 | `.env` không lên GitHub | `git ls-files \| grep -E "^\.env"` trống ([`02-secrets.md`](02-secrets.md) mục 3) | **P0** |
| D2 | Không rò khoá ra client | `curl` trang + grep thư mục build → không thấy `PAYOS_`, `GOCSPX-`, `AIza`, `ghp_`, `sk-`. Biến phía client chỉ dùng tiền tố công khai (`NEXT_PUBLIC_` …) và không chứa bí mật | **P0** |
| D3 | Bản bàn giao không chứa khoá | ZIP mã nguồn + `.env.example` + tài liệu → không có khoá thật | **P0** |
| D4 | Không log khoá / dữ liệu cá nhân | `console.log` không in token, mật khẩu, SĐT đầy đủ | P1 |
| D5 | Thư viện sạch lỗ hổng nặng | `npm audit --omit=dev` (hoặc `pip-audit`, `composer audit`) không còn high/critical trong mã chạy thật. Lỗi chỉ ở công cụ build → ghi chú, không chặn. ⛔ Không nâng major ngay trước launch | P1 |

## F. Dữ liệu khách hàng

| # | Mục | Đạt khi | Ưu tiên |
|---|---|---|---|
| F1 | Chỉ thu thông tin thật sự cần | ⛔ Không thu CCCD, số thẻ, ngày sinh nếu không cần | **P0** |
| F2 | **Không bao giờ tự lưu số thẻ** | Thanh toán do cổng xử lý; app không đụng số thẻ/CVV | **P0** |
| F3 | Xuất CSV chỉ cho admin | Link tải không đoán được, có kiểm quyền | **P0** |
| F4 | Có chỗ để khách yêu cầu xoá dữ liệu | Footer có email/Zalo liên hệ | P2 |
| F5 | Mã hoá từng trường trong DB | 🟢 Chỉ khi có dữ liệu định danh/sức khoẻ/thanh toán. Còn lại HTTPS + đóng DB + băm mật khẩu là đủ | P2 |

---

## "Chặn F12" — không làm được, kiểm cái này thay thế

Chặn chuột phải, khoá phím, phát hiện devtools đều vượt qua trong 10 giây và chỉ làm phiền khách thật.
Cái cần là **mở F12 cũng không phá được**. Chạy thật 4 phép thử:

1. Sửa HTML trong F12 (bật nút bị khoá, đổi giá, bỏ `hidden`) → gửi lên → **server vẫn từ chối**.
2. Gọi API admin từ console khi chưa đăng nhập → **401/403**.
3. `document.cookie` trong console → **không thấy** cookie đăng nhập (HttpOnly).
4. Gửi thêm trường lạ (`role`, `isAdmin`, `price`, `siteId`) → **bản ghi không đổi**.

Nói với user: *"Không ai chặn được F12, kể cả ngân hàng. Cái cần là dù mở F12 cũng không làm gì được, và web đang như vậy."*

> Row-level security của DB: MySQL không có, Postgres có nhưng ORM thường bỏ qua. Thay bằng B2 + B3.
