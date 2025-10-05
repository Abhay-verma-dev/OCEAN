
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
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".card");

  const revealOnScroll = () => {
    const triggerBottom = window.innerHeight * 0.85;

    cards.forEach(card => {
      const cardTop = card.getBoundingClientRect().top;

      if (cardTop < triggerBottom && cardTop > -card.offsetHeight) {
        card.classList.add("reveal-advanced");
      } else {
        card.classList.remove("reveal-advanced");
      }
    });
  };

  window.addEventListener("scroll", revealOnScroll);
  window.addEventListener("resize", revealOnScroll);
  revealOnScroll(); // initial check
});

