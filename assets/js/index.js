import { createPublicClient, TABLE_NAME } from "./config.js";

const supabase = createPublicClient();
const taskGrid = document.getElementById("task-grid");

const formatDate = (value) => {
  if (!value) {
    return "Tanggal belum tersedia";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getFileType = (url) => {
  const cleanedUrl = String(url || "").split("?")[0].toLowerCase();

  if (cleanedUrl.endsWith(".pdf")) {
    return "pdf";
  }

  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(cleanedUrl)) {
    return "image";
  }

  return "document";
};

const getFileLabel = (type) => {
  if (type === "pdf") return "PDF";
  if (type === "image") return "Image";
  return "Document";
};

const buildPreview = (url, title) => {
  const safeUrl = escapeHtml(url);
  const safeTitle = escapeHtml(title);
  const type = getFileType(url);

  if (type === "image") {
    return `
      <div class="task-preview">
        <img src="${safeUrl}" alt="${safeTitle}" loading="lazy" />
      </div>
    `;
  }

  if (type === "pdf") {
    return `
      <div class="task-preview">
        <iframe src="${safeUrl}" title="${safeTitle}" loading="lazy"></iframe>
      </div>
    `;
  }

  return `
    <div class="task-preview">
      <div class="task-placeholder">
        <div class="task-type">${getFileLabel(type)}</div>
        <p>Preview belum tersedia untuk tipe file ini.</p>
      </div>
    </div>
  `;
};

const renderTasks = (tasks) => {
  if (!tasks.length) {
    taskGrid.innerHTML = '<p class="empty-state">Belum ada data tugas yang ditampilkan.</p>';
    return;
  }

  taskGrid.innerHTML = tasks
    .map(
      (task) => `
        <article class="task-card">
          ${buildPreview(task.file_url, task.title)}
          <div class="task-topline">
            <div class="task-badge">${escapeHtml(task.course || "Mata Kuliah")}</div>
            <div class="task-type">${getFileLabel(getFileType(task.file_url))}</div>
          </div>
          <h4 class="task-title">${escapeHtml(task.title)}</h4>
          <p class="task-meta">${escapeHtml(task.course || "Mata kuliah belum diisi")} | ${formatDate(task.created_at)}</p>
          <p class="task-description">${escapeHtml(task.description || "Tidak ada deskripsi tugas.")}</p>
          <div class="task-actions">
            <a class="button button-primary" href="${escapeHtml(task.file_url)}" target="_blank" rel="noreferrer">Lihat File</a>
            <a class="button button-secondary" href="${escapeHtml(task.file_url)}" download>Download</a>
          </div>
        </article>
      `
    )
    .join("");
};

const loadTasks = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, title, course, description, file_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    taskGrid.innerHTML = `
      <p class="empty-state">
        Gagal mengambil data dari Supabase. Pastikan tabel <strong>${TABLE_NAME}</strong> sudah dibuat dan policy select sudah aktif.
      </p>
    `;
    return;
  }

  renderTasks(data || []);
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll("[data-reveal]").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index * 80, 320)}ms`;
  observer.observe(element);
});

loadTasks();
