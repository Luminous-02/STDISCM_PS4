const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const modal = document.getElementById("modal");
const fullVideo = document.getElementById("fullVideo");
const closeModal = document.getElementById("closeModal");

closeModal.addEventListener("click", () => toggleModal(false));
modal.addEventListener("click", (e) => {
  if (e.target === modal) toggleModal(false);
});

async function fetchVideos() {
  const res = await fetch("/api/videos");
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function toggleModal(open, src = "") {
  if (open) {
    fullVideo.src = src;
    fullVideo.currentTime = 0;
    fullVideo.play().catch(() => {});
    modal.classList.add("active");
  } else {
    fullVideo.pause();
    fullVideo.src = "";
    modal.classList.remove("active");
  }
}

function render(videos) {
  grid.innerHTML = "";
  if (!videos || videos.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  videos
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .forEach((video) => {
      const card = document.createElement("div");
      card.className = "card";
      const preview = document.createElement("video");
      preview.src = video.previewPath || "";
      preview.muted = true;
      preview.playsInline = true;
      preview.preload = "metadata";

      card.appendChild(preview);

      const meta = document.createElement("div");
      meta.className = "meta";
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = video.fileName || "Unnamed upload";
      meta.appendChild(name);

      const row = document.createElement("div");
      row.className = "pill";
      row.textContent = `Uploaded ${new Date(video.uploadedAt).toLocaleString()}`;
      meta.appendChild(row);

      const details = document.createElement("div");
      details.className = "pill";
      details.textContent = `${video.compressed ? "Compressed" : "Original"} • ${video.producerId || "unknown producer"}`;
      meta.appendChild(details);

      card.appendChild(meta);

      card.addEventListener("mouseenter", () => {
        preview.currentTime = 0;
        preview.play().catch(() => {});
      });
      card.addEventListener("mouseleave", () => {
        preview.pause();
        preview.currentTime = 0;
      });
      card.addEventListener("click", () => toggleModal(true, video.videoPath));

      grid.appendChild(card);
    });
}

async function init() {
  try {
    const videos = await fetchVideos();
    render(videos);
  } catch (err) {
    console.error(err);
    empty.textContent = "Failed to load videos.";
    empty.style.display = "block";
  }
}

init();
setInterval(init, 15000);
