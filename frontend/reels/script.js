const API_BASE_URL = window.location.hostname === 'localhost'
  ? "http://localhost:3000/api"
  : "/api";
const TOKEN_KEY = "swigram_token";

const tabFeed = document.getElementById("tab-feed");
const tabLiked = document.getElementById("tab-liked");
const panelTitle = document.getElementById("panelTitle");
const refreshBtn = document.getElementById("refresh");
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const feedEl = document.getElementById("feed");
const sentinelEl = document.getElementById("sentinel");
const meEl = document.getElementById("me");
const logoutBtn = document.getElementById("logout");

let activeView = "feed";
const PAGE_SIZE = 12;

let page = 1;
let hasMore = true;
let isLoading = false;
let io = null;
let videoIO = null;
const REPEAT_REELS = false;

function shouldRepeat() {
  return REPEAT_REELS && activeView === "feed";
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setStatus(message) {
  statusEl.textContent = message || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getMe() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.success ? data.user : null;
}

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function setActiveTab(view) {
  activeView = view;
  const isFeed = view === "feed";
  tabFeed.classList.toggle("active", isFeed);
  tabLiked.classList.toggle("active", !isFeed);
  panelTitle.textContent = isFeed ? "Feed" : "Liked";
  setupInfiniteScroll();
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCreatedAt(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "";
}

function attachVideoObserver() {
  if (videoIO) videoIO.disconnect();
  videoIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target;
        const video = card.querySelector("video");
        if (!video) continue;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          video.muted = true;
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    { root: feedEl, threshold: [0.2, 0.6, 0.9] }
  );
  gridEl.querySelectorAll(".card").forEach((card) => videoIO.observe(card));
}

function skeletonCardHTML() {
  return `
    <article class="card skeleton" aria-hidden="true">
      <div class="skPoster"></div>
      <div class="overlay">
        <div class="content">
          <div class="skLine" style="width: 72%"></div>
          <div class="skLine small"></div>
          <div class="skRow">
            <div class="skPill"></div>
            <div class="skLine small" style="width: 40%"></div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function showSkeleton(count = PAGE_SIZE) {
  const html = new Array(count).fill(0).map(skeletonCardHTML).join("");
  gridEl.insertAdjacentHTML("beforeend", html);
}

function clearSkeleton() {
  gridEl.querySelectorAll(".skeleton").forEach((el) => el.remove());
}

function appendReels(reels, meta) {
  if (!Array.isArray(reels) || reels.length === 0) return;
  const tmp = document.createElement("div");
  const isCache = meta?.source === 'cache';
  const responseTime = meta?.responseTime ?? '?';

  tmp.innerHTML = reels
    .map((r) => {
      const title = escapeHtml(r.title);
      const caption = escapeHtml(r.caption);
      const posterUrl = r.posterUrl ? escapeHtml(r.posterUrl) : "";
      const cdnUrl = r.cdnUrl ? escapeHtml(r.cdnUrl) : "";
      const id = escapeHtml(r._id);
      const liked = activeView === "liked" ? true : Boolean(r.liked);
      const createdAt = formatCreatedAt(r.createdAt);

      return `
        <article class="card" data-reel-id="${id}">
          ${cdnUrl
            ? `<video class="video" playsinline muted loop preload="metadata" ${
                posterUrl ? `poster="${posterUrl}"` : ""
              } src="${cdnUrl}"></video>`
            : `<div class="video" aria-hidden="true"></div>`
          }
          <div class="cacheBadge ${isCache ? 'cache' : 'db'}">
            ${isCache ? '⚡ Cached' : '🗄️ Fresh'} · ${responseTime}ms
          </div>
          <div class="overlay">
            <div class="content">
              <div class="title">${title}</div>
              <div class="caption">${caption}</div>
              <div class="row">
                <button class="likeBtn ${liked ? "liked" : ""}" type="button" data-like>
                  <span aria-hidden="true">${liked ? "♥" : "♡"}</span>
                  <span>${liked ? "Liked" : "Like"}</span>
                </button>
                <div class="meta">${createdAt}</div>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  while (tmp.firstChild) {
    gridEl.appendChild(tmp.firstChild);
  }

  attachVideoObserver();
}

async function loadNextPage() {
  if (isLoading) return;

  if (!hasMore) {
    if (!shouldRepeat()) return;
    await new Promise(resolve => setTimeout(resolve, 1500)); // ⬅️ fix
    page = 1;
    hasMore = true;
  }

  isLoading = true;

  try {
    showSkeleton(page === 1 ? PAGE_SIZE : 6);

    const path =
      activeView === "feed"
        ? `/reels?page=${page}&limit=${PAGE_SIZE}`
        : `/reels/liked?page=${page}&limit=${PAGE_SIZE}`;

    const data = await fetchJSON(path, {
      headers: { ...authHeaders() }
    });

    clearSkeleton();

    const items = Array.isArray(data.data) ? data.data : [];

    if (page === 1) {
      gridEl.innerHTML = "";
      if (items.length === 0) {
        gridEl.innerHTML = `<p class="status">No reels found.</p>`;
        hasMore = false;
        if (io) io.disconnect();
        isLoading = false;
        return;
      }
    }

    appendReels(items, data.meta);
    hasMore = Boolean(data.hasMore);
    page += 1;
    setStatus(hasMore ? "" : "You're all caught up.");

    if (page === 2) {
      attachVideoObserver();
    }
  } catch (err) {
    clearSkeleton();
    if (err.status === 401) {
      setStatus("Session expired. Please login again.");
      localStorage.removeItem(TOKEN_KEY);
      setTimeout(() => {
        window.location.href = "/authentication/";
      }, 600);
      return;
    }
    setStatus(err.message || "Failed to load.");
  } finally {
    isLoading = false;
  }
}

function resetAndLoad() {
  page = 1;
  hasMore = true;
  isLoading = false;
  gridEl.innerHTML = "";
  setStatus("");
  return loadNextPage();
}

function setupInfiniteScroll() {
  if (io) io.disconnect();
  io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting && !isLoading) {
        loadNextPage();
      }
    },
    { root: feedEl, rootMargin: "0px 0px 200px 0px", threshold: 0 }
  );
  io.observe(sentinelEl);
}

async function refresh() {
  try {
    await resetAndLoad();
  } catch (err) {
    if (err.status === 401) {
      setStatus("Session expired. Please login again.");
      localStorage.removeItem(TOKEN_KEY);
      setTimeout(() => {
        window.location.href = "/authentication/";
      }, 600);
      return;
    }
    setStatus(err.message || "Failed to load.");
  }
}

gridEl.addEventListener("click", async (e) => {
  const btn = e.target?.closest?.("[data-like]");
  if (!btn) return;

  const card = e.target.closest("[data-reel-id]");
  const reelId = card?.getAttribute("data-reel-id");
  if (!reelId) return;

  const token = getToken();
  if (!token) {
    setStatus("Please login to like reels.");
    setTimeout(() => (window.location.href = "/authentication/"), 600);
    return;
  }

  btn.disabled = true;
  try {
    const data = await fetchJSON(`/reels/${encodeURIComponent(reelId)}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      }
    });

    const liked = Boolean(data?.data?.liked);
    btn.classList.toggle("liked", liked);
    btn.innerHTML = `<span aria-hidden="true">${liked ? "♥" : "♡"}</span><span>${liked ? "Liked" : "Like"}</span>`;

    if (activeView === "liked" && !liked) {
      card.remove();
      if (!gridEl.querySelector(".card")) {
        gridEl.innerHTML = `<p class="status">No reels found.</p>`;
      }
    }
  } catch (err) {
    setStatus(err.message || "Failed to like.");
  } finally {
    btn.disabled = false;
  }
});

tabFeed.addEventListener("click", async () => {
  setActiveTab("feed");
  await refresh();
});

tabLiked.addEventListener("click", async () => {
  setActiveTab("liked");
  await refresh();
});

refreshBtn.addEventListener("click", refresh);

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/authentication/";
});

(async function init() {
  const me = await getMe().catch(() => null);
  if (!me) {
    meEl.textContent = "Guest";
  } else {
    meEl.textContent = me.email;
  }
  setActiveTab("feed");
  setupInfiniteScroll();
  await refresh();
})();