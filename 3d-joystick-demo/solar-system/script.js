// script.js - Solar System + NBL/Cupola navigation + Scroll Animations

document.addEventListener('DOMContentLoaded', () => {
  /* ========= Stars generation ========= */
  const starContainer = document.getElementById('stars');
  function makeStars(count = 120) {
    if (!starContainer) return;
    starContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const size = (Math.random() * 2.6 + 0.6).toFixed(2);
      s.style.width = s.style.height = size + "px";
      s.style.left = (Math.random() * 100) + "%";
      s.style.top = (Math.random() * 100) + "%";
      s.style.opacity = (Math.random() * 0.7 + 0.3).toFixed(2);
      s.style.animationDuration = (Math.random() * 2 + 2) + "s";
      starContainer.appendChild(s);
    }
  }
  makeStars();

  /* ========= Orbit play/pause ========= */
  const planetContainers = document.querySelectorAll(".planet-container");
  function setOrbitPlaying(playing) {
    planetContainers.forEach(pc => {
      if (pc && pc.style) pc.style.animationPlayState = playing ? "running" : "paused";
    });
  }
  setOrbitPlaying(true); // start running

  /* ========= Modal logic ========= */
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalClose = document.getElementById("modalClose");
  const closeModalBtn = document.getElementById("closeModal");
  const startExperienceBtn = document.getElementById("startExperience");
  const modalTitle = document.getElementById("modalTitle");
  const modalContent = document.getElementById("modalContent");

  let selectedExperience = null;

  function openModal(experienceKey) {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = false;
    selectedExperience = experienceKey;

    if (experienceKey === "nbl") {
      modalTitle.textContent = "NBL Training";
      modalContent.innerHTML = `
        <strong>Overview:</strong> Simulate neutral-buoyancy training: experiment with buoyancy, added mass, and handling suited tasks.<br><br>
        <strong>Tips:</strong> Adjust sliders in the next screen to tune buoyancy and mass for neutral behavior.
      `;
    } else if (experienceKey === "cupola") {
      modalTitle.textContent = "Cupola Experience";
      modalContent.innerHTML = `
        <strong>Overview:</strong> Step into a simulated Cupola viewport — full 360° Earth views and station exterior ops.<br><br>
        <strong>Tips:</strong> Use mouse/touch to pan. Click <em>Start</em> to open the Cupola demo.
      `;
    }

    setOrbitPlaying(false);
    document.body.style.overflow = "hidden";
    modalClose && modalClose.focus();
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    setOrbitPlaying(true);
    document.body.style.overflow = "";
    selectedExperience = null;
  }

  // Button listeners for main choices
  const nblBtn = document.getElementById("nblBtn");
  const cupolaBtn = document.getElementById("cupolaBtn");
  if (nblBtn) nblBtn.addEventListener("click", () => openModal("nbl"));
  if (cupolaBtn) cupolaBtn.addEventListener("click", () => openModal("cupola"));
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

  /* ========= Start Experience ========= */
  if (startExperienceBtn) {
    startExperienceBtn.addEventListener("click", () => {
      if (!selectedExperience) return;

      startExperienceBtn.disabled = true;
      startExperienceBtn.textContent = "Launching…";

      setTimeout(() => {
        startExperienceBtn.textContent = "Start";
        startExperienceBtn.disabled = false;
        closeModal();

        if (selectedExperience === "nbl") {
          window.location.href = "../nblsys/nbl.html";
        } else if (selectedExperience === "cupola") {
          window.location.href = "../cupolasys/cupola.html";
        }
      }, 800);
    });
  }

  /* Close modal on backdrop click */
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  /* ESC key closes modal */
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalBackdrop && !modalBackdrop.hidden) closeModal();
  });

  /* ========= Scroll Reveal Animations ========= */
  const benefitCards = document.querySelectorAll(".benefit-card");
  const extraButtons = document.querySelector(".extra-buttons");

  function revealOnScroll() {
    const triggerBottom = window.innerHeight * 0.85;

    benefitCards.forEach((card) => {
      const boxTop = card.getBoundingClientRect().top;
      if (boxTop < triggerBottom) card.classList.add("visible");
    });

    if (extraButtons) {
      const buttonsTop = extraButtons.getBoundingClientRect().top;
      if (buttonsTop < triggerBottom) extraButtons.classList.add("visible");
    }
  }

  window.addEventListener("scroll", revealOnScroll);
  window.addEventListener("load", revealOnScroll);
});
