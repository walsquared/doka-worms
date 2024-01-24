// https://www.volkshotel.nl/content/uploads/2023/09/DOKA_SITE_v2.mp4
// In action: https://www.volkshotel.nl/en/doka

type Point = {
  x: number;
  y: number;
};

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
const DOT_SIZE = 30;
const GRADIENT_STOPS = 3;
const WORM_LENGTH = 600;

const STARTING_POINT: Point = {
  x: canvas.width / 2,
  y: canvas.height / 2,
};

/**
 * A function to be passed to Array.sort().
 * Points always score lower the higher their x value
 * For points with the same x value, points score lower the lower their y value
 */
function orderPoints(pointA: Point, pointB: Point): number {
  // TODO: Fix ordering: top points are painting over bottom points
  return pointA.x === pointB.x ? pointA.y - pointB.y : pointB.x - pointA.x;
}

function makeSquare(sizeInDots: number): Point[] {
  if (sizeInDots === 0) return [];
  if (sizeInDots === 1) return [STARTING_POINT];

  const adjustedDotSize = DOT_SIZE * 0.9; // This removes a small between the squiggles

  const points: Point[] = [];
  const sizeLength = adjustedDotSize * (sizeInDots - 1); // -1 because the dots' origins are centered

  for (let i = 0; i < sizeInDots; i++) {
    // Top size
    points.push({
      x: STARTING_POINT.x - sizeLength / 2 + adjustedDotSize * i,
      y: STARTING_POINT.y - sizeLength / 2,
    });

    // Right side
    points.push({
      x: STARTING_POINT.x + sizeLength / 2,
      y: STARTING_POINT.y - sizeLength / 2 + adjustedDotSize * i,
    });

    // Bottom side
    points.push({
      x: STARTING_POINT.x + sizeLength / 2 - adjustedDotSize * i,
      y: STARTING_POINT.y + sizeLength / 2,
    });

    // Left side
    points.push({
      x: STARTING_POINT.x - sizeLength / 2,
      y: STARTING_POINT.y + sizeLength / 2 - adjustedDotSize * i,
    });
  }

  return points.sort(orderPoints);
}

const square = makeSquare(5);

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
  const gradientAnimationOffset = Math.sin(animationPosition / 40 + 10) * 100;
  const gradientXOffset = 3 * (startX / canvas.width - 0.5) * 500;
  const gradientYOffset = 3 * (startY / canvas.height - 0.5) * 100;

  const gradient = context.createLinearGradient(
    0 -
      canvas.width +
      gradientXOffset -
      gradientYOffset +
      gradientAnimationOffset,
    0,
    canvas.width +
      canvas.width +
      gradientXOffset -
      gradientYOffset +
      gradientAnimationOffset,
    0
  );

  // Adds 2x+1 color stops, where x is GRADIENT_STOPS
  // Add another canvas's color stops at the start and end so when the gradient moves left/right, it
  //  doesn't show a solid color.
  const gradientStopWidthRatio = 1 / (GRADIENT_STOPS * 2) / 3; // ÷3 because we're adding 2 more stops at the start and end
  const red = 'rgb(242, 0, 40)';
  const blue = 'rgb(26, 1, 174)';
  const darkblue = 'rgb(20, 0, 117)';

  gradient.addColorStop(0, darkblue);
  gradient.addColorStop(gradientStopWidthRatio / 5, blue);

  for (let i = 0; i < GRADIENT_STOPS * 3; i++) {
    // ×3 because we're adding 2 more stops at the start and end
    gradient.addColorStop((2 * i + 1) * gradientStopWidthRatio, red);
    gradient.addColorStop(
      (2 * i + 2) * gradientStopWidthRatio - gradientStopWidthRatio / 5,
      blue
    );
    gradient.addColorStop((2 * i + 2) * gradientStopWidthRatio, darkblue);

    const lastStopOfCycle =
      (2 * i + 2) * gradientStopWidthRatio + gradientStopWidthRatio / 5;
    if (lastStopOfCycle <= 1) {
      gradient.addColorStop(lastStopOfCycle, blue);
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
      startX - segmentXValue, // The wave isn't moving left/right, so we don't need to use animationPosition here
      startY + calcSegYValue(segmentXValue, animationPosition)
    );
  }

  // Stroke the worm with a gradient
  const gradient = makeGradient(startX, startY, animationPosition);
  // const gradient = makeGradient(startX, startY, 0);
  context.strokeStyle = gradient;
  context.stroke();

  context.closePath();
  context.restore();
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // // Test gradient on full screen
  // context.rect(0, 0, canvas.width, canvas.height);
  // const gradient = makeGradient(mouseX, mouseY, 0);
  // // const gradient = makeGradient(canvas.width / 2, 0, 0);
  // context.fillStyle = gradient;
  // context.fill();

  // drawSquiggle(STARTING_POINT.x, STARTING_POINT.y);

  // // Squiggle width
  // context.beginPath();
  // context.moveTo(STARTING_POINT.x, STARTING_POINT.y);
  // context.lineTo(STARTING_POINT.x + WORM_LENGTH, STARTING_POINT.y);
  // context.lineWidth = 1;
  // context.strokeStyle = 'white';
  // context.stroke();

  // Circle
  const circle: Point[] = [];
  for (let i = 0; i < 12; i++) {
    circle.push({
      x: STARTING_POINT.x + Math.cos((i / 12) * Math.PI) * DOT_SIZE * Math.PI,
      y: STARTING_POINT.y + Math.sin((i / 12) * Math.PI) * DOT_SIZE * Math.PI,
    });
  }
  for (let i = 0; i < 13; i++) {
    circle.push({
      x: STARTING_POINT.x + Math.cos((i / 12) * Math.PI) * DOT_SIZE * Math.PI,
      y: STARTING_POINT.y - Math.sin((i / 12) * Math.PI) * DOT_SIZE * Math.PI,
    });
  }

  circle.forEach((point) => drawSquiggle(point.x, point.y));
  // square.forEach((point) => drawSquiggle(point.x, point.y));

  window.requestAnimationFrame(draw);

  return draw;
}

draw();
