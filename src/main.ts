// https://www.volkshotel.nl/content/uploads/2023/09/DOKA_SITE_v2.mp4
// In action: https://www.volkshotel.nl/en/doka

let mouseX = 0;
let mouseY = 0;

function init2d() {
  const canvas = document.getElementById('main-canvas');
  if (!canvas) throw new Error('Canvas not found');

  const canvasElement = canvas as HTMLCanvasElement;
  const ctx = canvasElement.getContext('2d');
  if (!ctx) throw new Error('Context not found');

  const { x: canvasX, y: canvasY } = canvasElement.getBoundingClientRect();
  canvasElement.addEventListener('mousemove', (event: MouseEvent) => {
    mouseX = event.x - canvasX;
    mouseY = event.y - canvasY;
  });

  return { canvas: canvasElement, context: ctx };
}

const { canvas, context } = init2d();

const WAVE_SPEED = 5;
const DOT_SIZE = 20;
const GRADIENT_STOPS = 2;
const WORM_LENGTH = 700;

const startingPointX = DOT_SIZE / 2;
const startingPointY = canvas.height / 2;

const startOfAnimation = new Date();

function calcSegYValue(segX: number, animationPos: number): number {
  // A value to amplify the size of the wave
  const amplitudeModifier = 45;

  // A value to decrease slow down the wave's up and down movement
  const frequencyModifier = 35;

  return (
    amplitudeModifier * Math.sin((segX + animationPos) / frequencyModifier)
  );
}

/**
 * A function that makes a slightly altered gradient depending on an x and y value. The gradient is also animating left
 * and right.
 */
function makeGradient(
  startX: number,
  startY: number,
  animationPosition: number
): CanvasGradient {
  const gradientAnimationOffset = Math.sin(animationPosition / 40) * 100;
  const gradientXOffset = (startX / canvas.width - 0.5) * 300;
  const gradientYOffset = 1 - startY / canvas.height;

  const gradient = context.createLinearGradient(
    0 + gradientXOffset + gradientAnimationOffset,
    canvas.height,
    canvas.width + gradientXOffset + gradientAnimationOffset,
    canvas.height - gradientYOffset * canvas.height
  );

  // Adds 2x+1 color stops, where x is GRADIENT_STOPS
  const gradientStopWidth = 1 / (GRADIENT_STOPS * 2);
  gradient.addColorStop(0, 'darkblue');
  gradient.addColorStop(gradientStopWidth / 4, 'blue');

  for (let i = 0; i < GRADIENT_STOPS; i++) {
    gradient.addColorStop((2 * i + 1) * gradientStopWidth, 'red');
    gradient.addColorStop(
      (2 * i + 2) * gradientStopWidth - gradientStopWidth / 4,
      'blue'
    );
    gradient.addColorStop((2 * i + 2) * gradientStopWidth, 'darkblue');

    const lastStopOfCycle =
      (2 * i + 2) * gradientStopWidth + gradientStopWidth / 4;
    if (lastStopOfCycle <= 1) {
      gradient.addColorStop(lastStopOfCycle, 'blue');
    }
  }

  return gradient;
}

function drawSquiggle(startX: number, startY: number) {
  context.save();

  // Time since start of animation, multiplied by a factor to make it configurable
  const now = new Date();
  const animationPosition =
    ((now.getTime() - startOfAnimation.getTime()) / 100) * WAVE_SPEED;

  context.beginPath();
  context.moveTo(startX, startY + calcSegYValue(0, animationPosition));
  context.lineWidth = DOT_SIZE;
  context.lineCap = 'round';

  // Draw the squiggle
  for (let segmentXValue = 0; segmentXValue < WORM_LENGTH; segmentXValue++) {
    context.lineTo(
      startX + segmentXValue, // The wave isn't moving left/right, so we don't need to use animationPosition here
      startY + calcSegYValue(segmentXValue, animationPosition)
    );
  }

  // Stroke the worm with a gradient
  // const gradient = makeGradient(startX, startY, animationPosition);
  const gradient = makeGradient(startX, startY, 0);
  context.strokeStyle = gradient;
  context.stroke();

  context.closePath();
  context.restore();
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Test gradient on full screen
  context.rect(0, 0, canvas.width, canvas.height);
  const gradient = makeGradient(mouseX, mouseY, 0);
  context.fillStyle = gradient;
  context.fill();

  // drawSquiggle(startingPointX, startingPointY);

  // // Squiggle width
  // context.beginPath();
  // context.moveTo(startingPointX, startingPointY);
  // context.lineTo(startingPointX + WORM_LENGTH, startingPointY);
  // context.lineWidth = 1;
  // context.strokeStyle = 'white';
  // context.stroke();

  // // Circle
  // for (let i = 0; i < 12; i++) {
  //   drawSquiggle(
  //     0 + Math.cos((i / 12) * Math.PI) * DOT_SIZE * Math.PI,
  //     canvas.height / 2 + Math.sin((i / 12) * Math.PI) * DOT_SIZE * Math.PI,
  //     i
  //   );
  // }
  // for (let i = 0; i < 13; i++) {
  //   drawSquiggle(
  //     0 + Math.cos((i / 12) * Math.PI) * DOT_SIZE * Math.PI,
  //     canvas.height / 2 - Math.sin((i / 12) * Math.PI) * DOT_SIZE * Math.PI
  //   );
  // }

  // Top and left of a square
  for (let i = 0; i < 10; i++) {
    drawSquiggle(startingPointX + (10 - i) * 20, startingPointY);
  }
  for (let i = 0; i < 10; i++) {
    drawSquiggle(startingPointX, startingPointY + i * 20);
  }

  window.requestAnimationFrame(draw);

  return draw;
}

draw();
