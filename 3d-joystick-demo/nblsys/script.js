const model = document.getElementById('spacesuit');
const joystickEl = document.getElementById("joystick");
const knobEl = document.getElementById("knob");

// ---- Joystick logic ----
let dragging = false;
let joystick = { x: 0, y: 0 };
let pos = { x: 0, y: 0 };
let targetPos = { x: 0, y: 0 };

joystickEl.addEventListener("mousedown", () => dragging = true);
window.addEventListener("mouseup", () => {
    dragging = false;
    joystick.x = joystick.y = 0;
    knobEl.style.transform = `translate(0px,0px)`;
});

window.addEventListener("mousemove", e => {
    if (!dragging) return;

    const rect = joystickEl.getBoundingClientRect();
    let dx = (e.clientX - rect.left - rect.width / 2) / 50;
    let dy = (e.clientY - rect.top - rect.height / 2) / 50;

    const max = 1;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > max) {
        dx = dx / mag * max;
        dy = dy / mag * max;
    }

    joystick.x = dx;
    joystick.y = dy;

    const knobMax = 40;
    knobEl.style.transform = `translate(${dx * knobMax}px, ${dy * knobMax}px)`;
});

// ---- Bubbles Background ----
const canvas = document.getElementById("bubbleCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const bubbles = Array.from({ length: 40 }).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 5 + Math.random() * 10,
    speed: 0.5 + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.5
}));

function drawBubbles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
        ctx.fill();

        b.y -= b.speed;
        if (b.y + b.radius < 0) {
            b.y = canvas.height + b.radius;
            b.x = Math.random() * canvas.width;
            b.radius = 5 + Math.random() * 10;
        }
    }
}

// ---- Control Panel Physics ----
const densitySlider = document.getElementById("density");
const weightSlider = document.getElementById("weight");
const densityValue = document.getElementById("density-value");
const weightValue = document.getElementById("weight-value");

// --- New NBL Experience Parameters ---
const buoyancySlider = document.getElementById("buoyancy"); // –5 → +5
const balanceSelect = document.getElementById("balance");   // head / torso / legs
const foamSelect = document.getElementById("foam");         // left / right

// --- Physical Constants ---
const V = 0.145; // m³ (volume of astronaut + suit)
let rho = parseFloat(densitySlider.value) * 1000; // kg/m³
let M_total = parseFloat(weightSlider.value);     // kg

function computeBuoyancy() {
    rho = parseFloat(densitySlider.value) * 1000;
    M_total = parseFloat(weightSlider.value);

    const buoyantMass = rho * V;
    const m_add = buoyantMass - M_total;

    return m_add;
}

densitySlider.addEventListener("input", () => {
    densityValue.textContent = parseFloat(densitySlider.value).toFixed(1);
});
weightSlider.addEventListener("input", () => {
    weightValue.textContent = weightSlider.value;
});

// Set model size
const modelWidth = 400;
const modelHeight = 400;

function animate() {
    requestAnimationFrame(animate);

    drawBubbles();

    const m_add = computeBuoyancy();

    // --- Density affects astronaut speed (kept as-is) ---
    const baseSpeed = 2;
    const movementSpeed = baseSpeed / (parseFloat(densitySlider.value) + 0.5);

    // Apply joystick input
    targetPos.x += joystick.x * movementSpeed;
    targetPos.y += joystick.y * movementSpeed;

    // --- Apply NBL Suit Buoyancy Slider ---
    // –5: heavy → sinks faster, +5: floaty → drifts up
    const buoyancyEffect = parseFloat(buoyancySlider.value);
    targetPos.y += buoyancyEffect * 0.3; // scale factor for visual effect

    // --- Apply Balance / Stability ---
    // Head/Torso/Legs affects vertical drift
    if (balanceSelect.value === "head") targetPos.y -= 0.5;
    else if (balanceSelect.value === "legs") targetPos.y += 0.5;
    // Foam left/right affects horizontal drift
    if (foamSelect.value === "left") targetPos.x -= 0.5;
    else if (foamSelect.value === "right") targetPos.x += 0.5;

    // --- Clamp astronaut to screen boundaries ---
    const maxX = (window.innerWidth / 2) - (modelWidth / 2);
    const minX = -maxX;
    const maxY = (window.innerHeight / 2) - (modelHeight / 2);
    const minY = -maxY;

    if (targetPos.x > maxX) targetPos.x = maxX;
    if (targetPos.x < minX) targetPos.x = minX;
    if (targetPos.y > maxY) targetPos.y = maxY;
    if (targetPos.y < minY) targetPos.y = minY;

    // Smooth movement
    pos.x += (targetPos.x - pos.x) * 0.1;
    pos.y += (targetPos.y - pos.y) * 0.1;

    model.style.transform = `translate(-50%, -50%) translate3d(${pos.x}px, ${pos.y}px, 0)`;
}

animate();
