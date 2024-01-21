// https://www.volkshotel.nl/content/uploads/2023/09/DOKA_SITE_v2.mp4
// In action: https://www.volkshotel.nl/en/doka

function init2d() {
  const canvas = document.getElementById('main-canvas');
  if (!canvas) throw new Error('Canvas not found');

  const ctx = (canvas as HTMLCanvasElement).getContext('2d');
  if (!ctx) throw new Error('Context not found');

  return [canvas as HTMLCanvasElement, ctx] as const;
}
const [canvas, context] = init2d();

const WAVE_SPEED = 50;
const DOT_SIZE = 20;
const GRADIENT_STOPS = 4;

const startingPointX = DOT_SIZE / 2;
const startingPointY = canvas.height / 2;

const startOfAnimation = new Date();

function calcSinY(x: number): number {
  return 45 * Math.sin(x / 35);
}

function calcGradientOffset(x: number) {
  return -Math.sin(x / 2);
}

function drawSquiggle(startX: number, startY: number, i: number) {
  const now = new Date();
  const timeFactor =
    ((now.getTime() - startOfAnimation.getTime()) / 1000) * WAVE_SPEED;

  // context.clearRect(0, -canvas.height / 2, canvas.width, canvas.height);
  context.save();
  context.beginPath();

  context.moveTo(startX, calcSinY(timeFactor) + startY);

  for (let i = 0; i < 700; i++) {
    const x = i + timeFactor;

    context.lineTo(i + startX, calcSinY(x) + startY);
  }
  context.lineWidth = DOT_SIZE;
  context.lineCap = 'round';

  const gradientOffset = calcGradientOffset(timeFactor / 20) * 100;
  console.log({ gradientOffset });
  const gradient = context.createLinearGradient(
    0 - i * 5 + gradientOffset,
    0 - i * 5,
    canvas.width - i * 5 + gradientOffset,
    0 - i * 5
  );

  // Adds 2x+1 color stops, where x is GRADIENT_STOPS
  const gradientStopWidth = 1 / (GRADIENT_STOPS * 2);
  gradient.addColorStop(0, 'blue');
  for (let i = 0; i < GRADIENT_STOPS; i++) {
    gradient.addColorStop((2 * i + 1) * gradientStopWidth, 'red');
    gradient.addColorStop((2 * i + 2) * gradientStopWidth, 'blue');
  }

  context.strokeStyle = gradient;
  context.stroke();
  context.closePath();
  context.restore();
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  // drawSquiggle(startingPointX, startingPointY);
  for (let i = 0; i < 10; i++) {
    drawSquiggle(startingPointX + (10 - i) * 20, startingPointY, i);
  }
  for (let i = 0; i < 10; i++) {
    drawSquiggle(startingPointX, startingPointY + i * 20, i);
  }

  window.requestAnimationFrame(draw);

  return draw;
}

draw();
