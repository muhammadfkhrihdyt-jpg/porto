import {
  ADMIN_EMAIL,
  AUTO_LOGOUT_MS,
  ALLOWED_FILE_EXTENSIONS,
  FILE_INPUT_ACCEPT,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  STORAGE_BUCKET,
  TABLE_NAME,
  createAdminClient,
} from "./config.js";

const supabase = createAdminClient();

const adminHero = document.getElementById("admin-hero");
const loginWrap = document.getElementById("login-wrap");
const adminArea = document.getElementById("admin-area");
const loginForm = document.getElementById("login-form");
const uploadForm = document.getElementById("upload-form");
const logoutButton = document.getElementById("logout-button");
const refreshTasksButton = document.getElementById("refresh-tasks");
const authStatus = document.getElementById("auth-status");
const uploadStatus = document.getElementById("upload-status");
const taskGrid = document.getElementById("task-grid");
const adminEmailLabel = document.getElementById("admin-email-label");
const taskCountLabel = document.getElementById("task-count-label");
const formTitle = document.getElementById("form-title");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit-button");
const fileInput = document.getElementById("file");
const fileHelp = document.getElementById("file-help");

fileInput.accept = FILE_INPUT_ACCEPT;

let currentTasks = [];
let editingTask = null;
let inactivityTimer = null;
let isAdminSessionActive = false;

const setStatus = (element, message, type = "info") => {
  element.textContent = message;
  element.className = `status-box ${type} show`;
};

const clearStatus = (element) => {
  element.textContent = "";
  element.className = "status-box info";
};

const sanitizeFileName = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-");

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

const getFileTypeLabel = (url) => {
  const cleanedUrl = String(url || "").split("?")[0].toLowerCase();

  if (cleanedUrl.endsWith(".pdf")) return "PDF";
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(cleanedUrl)) return "Image";

  return "Document";
};

const updateTaskCount = (count = 0) => {
  if (!taskCountLabel) {
    return;
  }

  taskCountLabel.textContent = count === 1 ? "1 tugas tersimpan" : `${count} tugas tersimpan`;
};

const getFileExtension = (fileName) => {
  const normalizedName = String(fileName || "").toLowerCase().trim();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return normalizedName.slice(lastDotIndex);
};

const validateUploadFile = (file) => {
  if (!(file instanceof File) || !file.name) {
    return { valid: false, message: "Pilih file tugas terlebih dahulu." };
  }

  const extension = getFileExtension(file.name);

  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      message: `Format file tidak diizinkan. Gunakan ${ALLOWED_FILE_EXTENSIONS.join(", ")}.`,
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      message: `Ukuran file terlalu besar. Maksimal ${MAX_UPLOAD_SIZE_MB} MB.`,
    };
  }

  return { valid: true, message: "" };
};

const clearInactivityTimer = () => {
  if (inactivityTimer) {
    window.clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
};

const startInactivityTimer = () => {
  clearInactivityTimer();
  inactivityTimer = window.setTimeout(async () => {
    await supabase.auth.signOut();
    clearStatus(uploadStatus);
    setStatus(authStatus, "Session admin berakhir karena tidak ada aktivitas. Silakan login kembali.", "error");
    resetFormMode();
    await updateUI(null);
  }, AUTO_LOGOUT_MS);
};

const handleUserActivity = () => {
  if (isAdminSessionActive) {
    startInactivityTimer();
  }
};

const resetFormMode = () => {
  editingTask = null;
  formTitle.textContent = "Upload Tugas";
  submitButton.textContent = "Upload Tugas";
  cancelEditButton.classList.add("hidden");
  fileInput.required = true;
  fileHelp.textContent = `File wajib dipilih saat upload tugas baru. Format: ${ALLOWED_FILE_EXTENSIONS.join(", ")}. Maksimal ${MAX_UPLOAD_SIZE_MB} MB.`;
  uploadForm.reset();
};

const startEditTask = (task) => {
  editingTask = task;
  formTitle.textContent = "Edit Tugas";
  submitButton.textContent = "Simpan Perubahan";
  cancelEditButton.classList.remove("hidden");
  fileInput.required = false;
  fileHelp.textContent = `Biarkan kosong jika file lama tidak ingin diganti. Format: ${ALLOWED_FILE_EXTENSIONS.join(", ")}. Maksimal ${MAX_UPLOAD_SIZE_MB} MB.`;

  uploadForm.elements.title.value = task.title || "";
  uploadForm.elements.course.value = task.course || "";
  uploadForm.elements.description.value = task.description || "";
  fileInput.value = "";
  clearStatus(uploadStatus);
  window.scrollTo({ top: adminArea.offsetTop - 24, behavior: "smooth" });
};

const renderTasks = (tasks) => {
  currentTasks = tasks;

  if (!tasks.length) {
    updateTaskCount(0);
    taskGrid.innerHTML = '<p class="empty-state">Belum ada tugas yang tersimpan.</p>';
    return;
  }

  updateTaskCount(tasks.length);

  taskGrid.innerHTML = tasks
    .map(
      (task) => `
        <article class="task-card">
          <div class="task-topline">
            <div class="tag tag-course">${escapeHtml(task.course || "Mata Kuliah")}</div>
            <div class="tag tag-file">${getFileTypeLabel(task.file_url)}</div>
          </div>
          <h4>${escapeHtml(task.title)}</h4>
          <p class="task-meta">${escapeHtml(task.course || "Mata kuliah belum diisi")} | ${formatDate(task.created_at)}</p>
          <p class="task-description">${escapeHtml(task.description || "Tidak ada deskripsi tugas.")}</p>
          <div class="task-actions">
            <a class="button button-primary" href="${escapeHtml(task.file_url)}" target="_blank" rel="noreferrer">Buka File</a>
            <button class="button button-secondary" type="button" data-action="edit" data-id="${task.id}">Edit</button>
            <button class="button button-danger" type="button" data-action="delete" data-id="${task.id}">Delete</button>
          </div>
        </article>
      `
    )
    .join("");
};

const loadTasks = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, title, course, description, file_path, file_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    updateTaskCount(0);
    taskGrid.innerHTML = `
      <p class="empty-state">
        Gagal mengambil data. Pastikan policy <strong>select</strong> untuk role <strong>authenticated</strong> sudah aktif.
      </p>
    `;
    return;
  }

  renderTasks(data || []);
};

const updateUI = async (session) => {
  if (!session) {
    isAdminSessionActive = false;
    clearInactivityTimer();
    adminHero.classList.remove("hidden");
    loginWrap.classList.remove("hidden");
    adminArea.classList.add("hidden");
    adminEmailLabel.textContent = "Belum login";
    updateTaskCount(0);
    taskGrid.innerHTML = '<p class="empty-state">Login admin untuk melihat daftar tugas.</p>';
    return;
  }

  adminHero.classList.add("hidden");
  loginWrap.classList.add("hidden");
  adminArea.classList.remove("hidden");
  isAdminSessionActive = true;
  adminEmailLabel.textContent = session.user.email || "Admin aktif";
  startInactivityTimer();

  if (!editingTask) {
    resetFormMode();
  }

  await loadTasks();
};

const uploadFileIfNeeded = async (file, existingTask) => {
  const hasNewFile = file instanceof File && Boolean(file.name);

  let nextFilePath = existingTask?.file_path || "";
  let nextFileUrl = existingTask?.file_url || "";

  if (!hasNewFile) {
    return { hasNewFile, nextFilePath, nextFileUrl };
  }

  const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  nextFilePath = `uploads/${fileName}`;

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(nextFilePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) {
    throw new Error(`Upload file gagal. Pastikan policy Storage untuk role authenticated sudah aktif di bucket "${STORAGE_BUCKET}".`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(nextFilePath);

  nextFileUrl = publicUrlData.publicUrl;

  return { hasNewFile, nextFilePath, nextFileUrl };
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus(authStatus);

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  setStatus(authStatus, "Memeriksa akun admin...");

  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setStatus(authStatus, "Login gagal. Cek email atau password admin kamu.", "error");
    return;
  }

  if ((session?.user?.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    await supabase.auth.signOut();
    isAdminSessionActive = false;
    setStatus(authStatus, "Login ditolak. Hanya email admin yang diizinkan.", "error");
    return;
  }

  loginForm.reset();
  clearStatus(authStatus);
  await updateUI(session);
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus(uploadStatus);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    setStatus(uploadStatus, "Session admin tidak ditemukan. Silakan login ulang.", "error");
    await updateUI(null);
    return;
  }

  const formData = new FormData(uploadForm);
  const title = String(formData.get("title") || "").trim();
  const course = String(formData.get("course") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const file = formData.get("file");

  if (!editingTask && (!(file instanceof File) || !file.name)) {
    setStatus(uploadStatus, "Pilih file tugas terlebih dahulu.", "error");
    return;
  }

  if (file instanceof File && file.name) {
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setStatus(uploadStatus, validation.message, "error");
      return;
    }
  }

  try {
    setStatus(
      uploadStatus,
      editingTask
        ? file instanceof File && file.name
          ? "Sedang memperbarui tugas dan file..."
          : "Sedang memperbarui tugas..."
        : "Sedang upload file ke Supabase..."
    );

    const { hasNewFile, nextFilePath, nextFileUrl } = await uploadFileIfNeeded(file, editingTask);

    if (editingTask) {
      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({
          title,
          course,
          description,
          file_path: nextFilePath,
          file_url: nextFileUrl,
        })
        .eq("id", editingTask.id);

      if (updateError) {
        throw new Error(`Gagal memperbarui tugas. Cek policy update pada tabel "${TABLE_NAME}".`);
      }

      if (hasNewFile && editingTask.file_path && editingTask.file_path !== nextFilePath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([editingTask.file_path]);
      }

      resetFormMode();
      setStatus(uploadStatus, "Tugas berhasil diperbarui.");
    } else {
      const { error: insertError } = await supabase.from(TABLE_NAME).insert({
        title,
        course,
        description,
        file_path: nextFilePath,
        file_url: nextFileUrl,
      });

      if (insertError) {
        throw new Error(`File berhasil diupload, tetapi metadata gagal disimpan. Cek policy tabel "${TABLE_NAME}" untuk authenticated.`);
      }

      resetFormMode();
      setStatus(uploadStatus, "Tugas berhasil diupload.");
    }

    await loadTasks();
  } catch (error) {
    setStatus(uploadStatus, error.message || "Terjadi kesalahan saat menyimpan tugas.", "error");
  }
});

refreshTasksButton.addEventListener("click", loadTasks);

cancelEditButton.addEventListener("click", () => {
  clearStatus(uploadStatus);
  resetFormMode();
});

taskGrid.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const taskId = Number(actionButton.dataset.id);
  const task = currentTasks.find((item) => Number(item.id) === taskId);
  if (!task) {
    return;
  }

  if (actionButton.dataset.action === "edit") {
    startEditTask(task);
    return;
  }

  if (actionButton.dataset.action === "delete") {
    const confirmed = window.confirm(`Hapus tugas "${task.title}"? File di storage juga akan ikut dihapus.`);
    if (!confirmed) {
      return;
    }

    clearStatus(uploadStatus);
    setStatus(uploadStatus, "Sedang menghapus tugas...");

    const { error: deleteDbError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", task.id);

    if (deleteDbError) {
      setStatus(uploadStatus, `Gagal menghapus data tugas. Cek policy delete pada tabel "${TABLE_NAME}".`, "error");
      return;
    }

    if (task.file_path) {
      const { error: deleteStorageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([task.file_path]);

      if (deleteStorageError) {
        setStatus(uploadStatus, "Data tugas terhapus, tetapi file di storage gagal dihapus. Cek policy delete Storage.", "error");
        await loadTasks();
        return;
      }
    }

    if (editingTask && Number(editingTask.id) === task.id) {
      resetFormMode();
    }

    setStatus(uploadStatus, "Tugas berhasil dihapus.");
    await loadTasks();
  }
});

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  clearStatus(uploadStatus);
  resetFormMode();
  await updateUI(null);
});

supabase.auth.onAuthStateChange((_event, session) => {
  updateUI(session);
});

["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((eventName) => {
  window.addEventListener(eventName, handleUserActivity, { passive: true });
});

const {
  data: { session: initialSession },
} = await supabase.auth.getSession();

updateUI(initialSession);
