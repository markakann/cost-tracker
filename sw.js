// 物料成本 App 的背景程式（讓 App 可以安裝到手機、沒網路也能打開）
// 自己網站的檔案（index.html 等）：有網路一律抓最新版，沒網路才用上次存的
// → 上傳新版後，打開 App 就是新版，不會卡在舊的快取
// React／Tailwind／Firebase 這些外部程式：存起來重複使用，開啟比較快
// Firebase 資料同步的連線不經過這裡
const CACHE = "cost-tracker-v1";
const CORE = ["./", "./manifest.json", "./icon-192.png", "./icon-512.png"];
const LIB_HOSTS = ["unpkg.com", "cdn.tailwindcss.com", "www.gstatic.com"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      // 只清掉自己的舊版快取：班表、深夜電台也在同一個網站（markakann.github.io），快取是共用的，不能動到它們的
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cost-tracker-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./") : undefined))
        )
    );
    return;
  }

  if (LIB_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === "opaque") {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
