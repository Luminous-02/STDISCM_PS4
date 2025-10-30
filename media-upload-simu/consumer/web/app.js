const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const closeBtn = document.getElementById('closeBtn');
const fullPlayer = document.getElementById('fullPlayer');

async function loadVideos() {
  const res = await fetch('/api/videos');
  const items = await res.json();
  gallery.innerHTML = '';
  for (const v of items) {
    const card = document.createElement('div');
    card.className = 'card';

    // teaser player
    const teaser = document.createElement('video');
    teaser.src = v.pathRel;
    teaser.muted = true;
    teaser.preload = 'metadata'; 
    teaser.playsInline = true;

    // hover preview logic - play from t=0, stop at 10s
    let previewTimer = null;
    const stopPreview = () => {
      teaser.pause();
      teaser.currentTime = 0;
      if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }
    };
    teaser.addEventListener('mouseenter', async () => {
      try {
        teaser.currentTime = 0;
        await teaser.play();
        previewTimer = setInterval(() => {
          if (teaser.currentTime >= 10) stopPreview();
        }, 200);
      } catch {}
    });
    teaser.addEventListener('mouseleave', stopPreview);
    teaser.addEventListener('touchstart', stopPreview); // mobile friendly no-hover?

    teaser.addEventListener('error', () => {
      console.error('Teaser error for', v.filename, teaser.error);
    });


    // if click, open full modal
    teaser.addEventListener('click', () => {
      fullPlayer.src = v.pathRel;
      fullPlayer.currentTime = 0;
      fullPlayer.play().catch(()=>{});
      modal.classList.remove('hidden');
    });

    fullPlayer.addEventListener('error', () => {
      console.error('Full player error for', fullPlayer.currentSrc, fullPlayer.error);
    });

    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('div');
    name.textContent = v.filename;
    name.title = v.filename;
    const size = document.createElement('div');
    size.textContent = humanBytes(v.size);
    meta.append(name, size);

    card.append(teaser, meta);
    gallery.append(card);
  }
}

function humanBytes(n) {
  const u = ['B','KB','MB','GB','TB'];
  let i = 0;
  while (n >= 1024 && i < u.length-1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}

closeBtn.addEventListener('click', () => {
  fullPlayer.pause();
  modal.classList.add('hidden');
  fullPlayer.src = '';
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeBtn.click();
});

loadVideos().catch(console.error);