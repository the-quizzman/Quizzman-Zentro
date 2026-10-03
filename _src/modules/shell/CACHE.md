# Cache của QMF Shell

Cơ chế này không dùng service worker và không gọi API xóa cache. Trình duyệt và CDN giữ file theo `Cache-Control`. Bản mới là một URL mới (`?v=`). Tab đang mở được kéo sang URL đó bằng soft-reload khi `REV` đổi.

Nguồn đang chạy: `dist/modules/shell/` trên `ui.quizzman.com`. Header HTTP nằm ở `ui.quizzman.com.conf`. `_src/modules/shell/` là bản sửa; phải copy sang `dist/` thì trình duyệt mới nhận.

## Hai tầng cache

| URL | Cache-Control | Ý nghĩa |
| --- | --- | --- |
| `/qmf/dist/modules/shell/qmf-shell.js` | `no-store` | Loader. Luôn hỏi lại máy chủ. |
| `/qmf/dist/modules/shell/qmf-shell.rev` | `no-store` | Tín hiệu `REV` cho tab đang mở. |
| `/qmf/dist/**` còn lại (runtime, header, CSS module) | `public, max-age=31536000, immutable` | Một năm. URL cũ không được sửa nội dung. |
| `i18n-dom.js`, `settings-float.js`, `auth-widget.js`, `prefs-detect.js` | `max-age=60, stale-while-revalidate=300` | Ngoại lệ, không immutable. |
| `qmf.js`, `qmf.css`, `tokens.css`, `ui.css`, `manifest.json` | `max-age=60, stale-while-revalidate=300` | Entry ổn định, không gắn `REV`. |
| Ảnh (`.png`, `.webp`, `.svg`, `.ico`, …) | `max-age=2592000, stale-while-revalidate=604800` | 30 ngày. Location regex ảnh thắng prefix `/qmf/assets/`. |

`immutable` có nghĩa là cùng một URL (kể cả `?v=`) phải trả cùng một byte. Sửa file rồi giữ nguyên `?v=` thì client đã tải URL đó sẽ giữ bản cũ đến một năm.

## `REV` phải khớp ở ba chỗ

1. `var REV` trong `qmf-shell.js` (loader).
2. `Runtime.shell` trong `qmf-shell.runtime.js`.
3. Dòng đầu của `qmf-shell.rev` — một token, khớp `^[0-9A-Za-z._+-]+$`.

Loader kéo runtime bằng URL immutable:

```text
/qmf/dist/modules/shell/qmf-shell.runtime.js?v=<REV>
```

Runtime khai báo version từng gói (`header`, `auth`, `legatus`, `sso`, `prefs`, …). `moduleUrl()` nối `?v=<version gói>` vào file module. Ví dụ header là `unified-header.js?v=<packages.header>`.

Vì runtime nằm trong cache immutable, map version gói chỉ tới được client khi `REV` đổi. Đổi `packages.header` trong file runtime cũ không có hiệu lực với tab đã giữ `runtime.js?v=<REV cũ>`.

## Soft-reload, không purge

Loader (`startRevWatch`) hỏi `qmf-shell.rev` với `cache: 'no-store'` và `?_=<timestamp>`:

- lần đầu sau 2,5 giây
- mỗi 60 giây
- mỗi lần tab chuyển sang visible (không gắn vào `focus`, để khỏi cắt giữa lúc gõ)

Nếu token trên máy chủ khác `REV` của loader đang chạy, trang gọi `location.replace` một lần:

```text
?_qmf=<rev mới>&_qmf_why=<lý do>&_t=<timestamp>
```

`sessionStorage.qmf_shell_soft_reload` bằng đúng rev đích thì bỏ qua, tránh lặp. Sau khi runtime mới tải xong và `Runtime.shell` khớp loader, key này được xóa.

Tab khác nhận cùng tín hiệu qua `BroadcastChannel('qmf-shell-rev')` và `localStorage.qmf_shell_rev_signal`.

Chuỗi `cache flush` trong code chỉ là lý do mặc định của lần replace đó. Không có `caches.delete()` và không có lệnh purge CDN.

Các lý do được coi là phát hành fleet (có thể bị hoãn ở trang đang làm việc): `shell:rev …`, `shell:bc`, `shell:storage`, `cache flush`, `shell:runtime-mismatch`.

Hoãn reload khi đang gõ (`input`, `textarea`, `contenteditable`) đến lúc rời ô hoặc tab bị ẩn. Trang soạn thảo, live và game không tự tải lại khi lý do thuộc fleet; hiện một thông báo tiếng Anh, một lần cho mỗi rev (`/quiz-editor`, `/slide-studio`, `/slide`, `/host`, `/live`, `/tycoon`, `/arena`, `/the-vault`, hoặc `window.QMF_SOFT_RELOAD_DEFER = true`). Đổi ngôn ngữ / vùng (`prefs:…`) vẫn reload ở những trang đó, trừ khi đang gõ.

Loader cũng soft-reload một lần nếu runtime không tải được, hoặc `Runtime.shell` khác `REV` của loader.

## Khi sửa cái gì thì đổi số nào

| Việc sửa | Phải đổi |
| --- | --- |
| Logic loader hoặc chuỗi `REV` | `REV` ở cả ba chỗ, rồi copy `dist/` |
| Nội dung `qmf-shell.runtime.js` (kể cả số version gói) | `REV` ở cả ba chỗ. Runtime cũ đã immutable. |
| `unified-header.js` hoặc CSS header | `packages.header`, rồi `REV`. File header immutable theo `?v=` cũ. |
| `legatus-bridge.js` | `packages.legatus`, rồi `REV`. Không gắn bridge vào version header. |
| Icon nav (`NAV_ICON_VER` trong header) | Số icon, rồi `packages.header`, rồi `REV`. Ảnh cache 30 ngày theo từng URL. |
| Chỉ `qmf-shell.js` hoặc `.rev` | Không cần query mới: hai file này là `no-store`. Vẫn phải tăng `REV` bên trong loader nếu muốn tab đang mở chuyển runtime. |

Thứ tự an toàn khi phát hành: sửa file module → tăng version gói trong runtime → tăng `REV` loader, `Runtime.shell` và `qmf-shell.rev` → copy sang `dist/modules/shell/` (và bản module trong `dist/modules/`). Tab đang mở tự `location.replace` trong vòng một phút. Không cần hard refresh.
