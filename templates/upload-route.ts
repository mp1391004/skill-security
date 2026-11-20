import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';

// Route upload ảnh cho CMS — chuẩn: references/04-app-security.md mục C2–C5
//  1. Chỉ admin đã đăng nhập mới ghi được file (401)
//  2. Giới hạn 5MB
//  3. KHÔNG nhận SVG (SVG chứa <script> -> XSS chiếm phiên admin)
//  4. Kiểm MAGIC BYTES, không tin file.type do trình duyệt gửi lên
//     (đổi tên shell.php -> anh.jpg vẫn bị chặn)
//  5. Lưu bằng tên ngẫu nhiên + đuôi do server tự quyết
//  6. Thư mục lưu đọc từ UPLOAD_DIR, đặt NGOÀI thư mục code để deploy lại không mất ảnh
//     (references/03-deploy.md mục 2). Khi UPLOAD_DIR nằm ngoài public/, phục vụ ảnh bằng
//     Nginx alias (VPS) hoặc một route đọc file tĩnh; chỉ trả file, không thực thi.

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_PREFIX = process.env.UPLOAD_PUBLIC_PREFIX || '/uploads';

/** Đọc chữ ký đầu file để biết kiểu THẬT. Trả về đuôi an toàn, hoặc null nếu không nhận. */
function sniffExt(buf: Buffer): string | null {
  const b = (...bytes: number[]) => bytes.every((v, i) => buf[i] === v);

  if (b(0xff, 0xd8, 0xff)) return 'jpg';                                   // JPEG
  if (b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png';     // PNG
  if (b(0x47, 0x49, 0x46, 0x38)) return 'gif';                             // GIF87a/89a

  // RIFF....WEBP
  if (b(0x52, 0x49, 0x46, 0x46) && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';

  // ISO-BMFF: ....ftyp + brand avif/avis
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return 'avif';
  }
  return null;
}

export async function POST(req: Request) {
  // 1. Chặn người chưa đăng nhập
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });
  }

  // 2. Giới hạn dung lượng
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ảnh quá 5MB, bạn chọn ảnh nhẹ hơn nhé' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // 3 + 4. Kiểu file THẬT quyết định, không tin file.type
  const ext = sniffExt(buf);
  if (!ext) {
    return NextResponse.json(
      { error: 'Chỉ nhận ảnh JPG, PNG, WebP, GIF, AVIF (không nhận SVG)' },
      { status: 400 },
    );
  }

  // 5 + 6. Tên ngẫu nhiên + đuôi do server quyết, lưu ở UPLOAD_DIR
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);

  return NextResponse.json({ url: `${PUBLIC_PREFIX}/${name}` });
}
