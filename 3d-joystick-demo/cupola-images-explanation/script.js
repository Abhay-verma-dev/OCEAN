// Reveal cards on scroll (same as NBL JS)
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.card');

  function showCards() {
    const triggerBottom = window.innerHeight * 0.85;
    cards.forEach(card => {
      const boxTop = card.getBoundingClientRect().top;
      if (boxTop < triggerBottom) {
        card.classList.add('show');
      }
    });
  }

  window.addEventListener('scroll', showCards);
  showCards();
});
document.addEventListener('DOMContentLoaded', () => {
  // Initialize AOS
  AOS.init({
    duration: 1200,
    easing: 'ease-in-out-quart',
    once: false, // allows animation again
    mirror: false,
    offset: 120
  });

  const cards = document.querySelectorAll('.card');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Animate in immediately
        entry.target.classList.add('reveal-advanced');
      } else {
        // Animate out when scrolling up
        entry.target.classList.remove('reveal-advanced');
      }
    });
  }, { threshold: 0.25 });

  cards.forEach(card => observer.observe(card));
});

