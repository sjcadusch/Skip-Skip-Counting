const PIXELS_PER_UNIT = 56;
const VISIBLE_MARGIN = 180;
const WALKER_IMAGES = ["Skip Walking 1.png", "Skip Walking 2.png"];
const WALKER_WIDTH = 75;
const WALKER_HEIGHT = 75;

const form = document.getElementById("controls");
const startInput = document.getElementById("start");
const endInput = document.getElementById("end");
const stepInput = document.getElementById("step");
const speedInput = document.getElementById("speed");
const statusEl = document.getElementById("status");
const viewport = document.getElementById("viewport");
const track = document.getElementById("track");
const arrowLayer = document.getElementById("arrowLayer");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");

let timer = null;
let sequence = [];
let numberLineValues = [];
let currentIndex = 0;
let isPaused = false;
let config = null;

function buildSequence(start, end, step) {
  if (step <= 0) {
    return [];
  }

  const values = [start];
  let current = start;
  const limit = start <= end ? (value) => value + step <= end : (value) => value - step >= end;

  while (limit(current)) {
    current = start <= end ? current + step : current - step;
    values.push(current);
  }

  return values;
}

function setupArrowDefs() {
  arrowLayer.innerHTML = `
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8 Z" fill="#d81d33"></path>
      </marker>
    </defs>
  `;
}

function toX(value) {
  return (value - config.min) * PIXELS_PER_UNIT + VISIBLE_MARGIN;
}

function renderStaticLine() {
  const base = document.createElement("div");
  base.className = "baseline";
  track.appendChild(base);

  numberLineValues.forEach((value) => {
    const x = toX(value);

    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = `${x}px`;
    track.appendChild(tick);

    const label = document.createElement("div");
    label.className = "label";
    label.dataset.value = String(value);
    label.style.left = `${x}px`;
    label.textContent = value;
    track.appendChild(label);
  });

  const counter = document.createElement("div");
  counter.id = "counter";
  counter.className = "counter";
  counter.textContent = "Step 0";
  track.appendChild(counter);

  const width = toX(config.max) + VISIBLE_MARGIN;
  track.style.width = `${width}px`;
  arrowLayer.setAttribute("width", String(width));
  arrowLayer.setAttribute("height", String(viewport.clientHeight));
  arrowLayer.setAttribute("viewBox", `0 0 ${width} ${viewport.clientHeight}`);
}

function clearAnimation() {
  track.innerHTML = "";
  setupArrowDefs();
  [...arrowLayer.querySelectorAll("path.skip-arrow")].forEach((node) => node.remove());
}

function highlightValue(value) {
  const labels = [...track.querySelectorAll(".label")];
  labels.forEach((label) => {
    label.classList.toggle("active", Number(label.dataset.value) === value);
  });

  const counter = document.getElementById("counter");
  if (counter) {
    counter.textContent = `Step ${currentIndex}: ${value}`;
  }
}

function addArrow(fromValue, toValue, stepNumber) {
  const fromX = toX(fromValue);
  const toXValue = toX(toValue);
  const center = (fromX + toXValue) / 2;
  const distance = Math.abs(toXValue - fromX);
  const arcHeight = Math.max(40, Math.min(130, distance * 0.45));
  const y = 176;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "skip-arrow");
  path.setAttribute("d", `M ${fromX} ${y} Q ${center} ${y - arcHeight} ${toXValue} ${y}`);
  arrowLayer.appendChild(path);

  const walker = document.createElement("img");
  walker.className = "walker";
  walker.src = WALKER_IMAGES[(stepNumber - 1) % WALKER_IMAGES.length];
  walker.alt = "";
  walker.setAttribute("aria-hidden", "true");
  walker.width = WALKER_WIDTH;
  walker.height = WALKER_HEIGHT;

  const direction = toXValue >= fromX ? 1 : -1;
  const facing = direction > 0 ? "" : " scaleX(-1)";
  walker.style.left = `${toXValue}px`;
  walker.style.top = `${y}px`;
  walker.style.transform = `translate(-50%, -72%)${facing}`;
  track.appendChild(walker);
}

function centerOn(value) {
  const x = toX(value);
  const target = Math.max(0, x - viewport.clientWidth / 2);
  viewport.scrollTo({ left: target, behavior: "smooth" });
}

function tick() {
  if (currentIndex >= sequence.length) {
    statusEl.textContent = "Done! Press Play to run again.";
    stopTimer();
    return;
  }

  const currentValue = sequence[currentIndex];
  highlightValue(currentValue);
  centerOn(currentValue);

  if (currentIndex > 0) {
    addArrow(sequence[currentIndex - 1], currentValue, currentIndex);
  }

  statusEl.textContent = `Counting by ${config.step}: now on ${currentValue}`;
  currentIndex += 1;
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function play() {
  if (!sequence.length) {
    return;
  }

  stopTimer();
  isPaused = false;
  pauseBtn.textContent = "Pause";
  tick();
  timer = setInterval(tick, config.speed);
}

function configureAndRender() {
  const start = Number(startInput.value);
  const end = Number(endInput.value);
  const step = Number(stepInput.value);
  const speed = Math.max(150, Number(speedInput.value) || 850);

  sequence = buildSequence(start, end, Math.abs(step));

  if (sequence.length < 2) {
    statusEl.textContent = "Please choose values that produce at least 2 jumps.";
    clearAnimation();
    return false;
  }

  config = {
    start,
    end,
    step: Math.abs(step),
    speed,
    min: Math.min(...sequence),
    max: Math.max(...sequence),
  };

  const direction = start <= end ? 1 : -1;
  numberLineValues = [];
  for (let value = start; direction > 0 ? value <= end : value >= end; value += direction) {
    numberLineValues.push(value);
  }

  currentIndex = 0;
  clearAnimation();
  renderStaticLine();
  centerOn(sequence[0]);
  return true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const ok = configureAndRender();
  if (ok) {
    play();
  }
});

pauseBtn.addEventListener("click", () => {
  if (!sequence.length) {
    return;
  }

  if (!isPaused) {
    stopTimer();
    isPaused = true;
    pauseBtn.textContent = "Resume";
    statusEl.textContent = "Paused.";
  } else {
    isPaused = false;
    pauseBtn.textContent = "Pause";
    timer = setInterval(tick, config.speed);
    statusEl.textContent = "Resumed.";
  }
});

resetBtn.addEventListener("click", () => {
  stopTimer();
  currentIndex = 0;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  const ok = configureAndRender();
  statusEl.textContent = ok ? "Reset complete. Press Play to begin." : statusEl.textContent;
});

setupArrowDefs();
configureAndRender();
