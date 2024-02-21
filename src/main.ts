// https://www.volkshotel.nl/content/uploads/2023/09/DOKA_SITE_v2.mp4
// In action: https://www.volkshotel.nl/en/doka
import makeSquare from './shapes/square';
import makeCircle from './shapes/circle';
import makeLine from './shapes/line';
import { Point } from './types';
import DokaJson from './doka-word.json';

type PointWithOrder = Point & { index: number };

const canvas = document.getElementById('main-canvas')! as HTMLCanvasElement;
const context = canvas.getContext('2d')!;

let mouseX = 0;
let mouseY = 0;

let lastDotPlaced: Point | null = null;
let placeToPlot: Point = { x: mouseX, y: mouseY };

const { x: canvasX, y: canvasY } = canvas.getBoundingClientRect();

canvas.addEventListener('mousemove', (event: MouseEvent) => {
  mouseX = event.x - canvasX;
  mouseY = event.y - canvasY;
});

let isPlaying = true;
type Tool = 'pencil' | 'wand' | 'line' | 'square' | 'circle';
let activeTool: Tool = 'wand';

const WAVE_SPEED = 5;
const DOT_SIZE = 30;
const GRADIENT_STOPS = 3;
const WORM_LENGTH = 300;

let startOfTimeline = new Date();

const allPoints: PointWithOrder[] = [];
const redoList: Point[] = [];

/**
 * A function to be passed to Array.sort().
 * Points further left are considered greater so that they are drawn last (therefore on top).
 * For points with the same x value, pointers further down are considered greater.
 */
function orderPoints(pointA: Point, pointB: Point): number {
  return pointA.x === pointB.x ? pointA.y - pointB.y : pointB.x - pointA.x;
}

function addPoints(points: Point[]) {
  const startingIndex = allPoints.length;
  allPoints.push(
    ...points.map((point, index) => ({
      ...point,
      index: startingIndex + index,
    }))
  );
  allPoints.sort(orderPoints);
}

// Add the points from the Doka word
addPoints(DokaJson);

function calcSegYValue(segX: number, animationPos: number): number {
  // As this value increases, the wave becomes taller
  const amplitudeModifier = 45;

  // As this value increases, the wave becomes longer
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
  // Add another canvas's worth of color stops at the start and end so when the gradient moves left/right, it
  //  doesn't show a solid color.
  const gradientStopWidthRatio = 1 / (GRADIENT_STOPS * 2) / 3; // ÷3 because we're adding 2 more stops at the start and end
  const red = 'rgb(242, 0, 40)';
  const blue = 'rgb(26, 1, 174)';
  const darkblue = 'rgb(20, 0, 117)';

  gradient.addColorStop(0, darkblue);
  gradient.addColorStop(gradientStopWidthRatio / 5, blue);

  // ×3 because we're adding 2 more stops at the start and end
  for (let i = 0; i < GRADIENT_STOPS * 3; i++) {
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

/**
 * A function that draws the gradient given to squiggles on the whole screen.
 * The gradient displayed is the one that would be used for a squiggle if that was drawn at the current cursor position.
 */
function testGradient() {
  context.rect(0, 0, canvas.width, canvas.height);
  const gradient = makeGradient(mouseX, mouseY, 0);
  context.fillStyle = gradient;
  context.fill();
}

function drawSquiggle(startX: number, startY: number) {
  context.save();

  // Time since start of animation, multiplied by a factor to make it configurable
  const now = new Date();
  const animationPosition = !isPlaying
    ? 0
    : ((now.getTime() - startOfTimeline.getTime()) / 100) * WAVE_SPEED;

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

  // testGradient();

  allPoints.forEach((point) => drawSquiggle(point.x, point.y));

  // ------------------------------
  // EDITOR
  // ------------------------------

  if (!isPlaying) {
    context.beginPath();
    context.strokeStyle = 'white';

    if (lastDotPlaced) {
      // Find from the last point to the mouse
      const theta = Math.atan2(
        mouseY - lastDotPlaced.y,
        mouseX - lastDotPlaced.x
      );

      placeToPlot = {
        x: lastDotPlaced.x + Math.cos(theta) * DOT_SIZE * 0.9,
        y: lastDotPlaced.y + Math.sin(theta) * DOT_SIZE * 0.9,
      };
    } else {
      placeToPlot = {
        x: mouseX,
        y: mouseY,
      };
    }

    // Draw the cursor
    context.arc(placeToPlot.x, placeToPlot.y, DOT_SIZE / 2, 0, Math.PI * 2);
    context.stroke();
    context.closePath();
  }

  // ------------------------------

  window.requestAnimationFrame(draw);
}

const square = makeSquare({
  dotSize: DOT_SIZE,
  startingPoint: {
    x: (canvas.width / 4) * 3,
    y: canvas.height / 2,
  },
})(5);

const line = makeLine({
  dotSize: DOT_SIZE,
  startingPoint: {
    x: canvas.width / 2,
    y: canvas.height / 2,
  },
})(5, 0);

const circle = makeCircle({
  dotSize: DOT_SIZE,
  startingPoint: {
    x: canvas.width / 4,
    y: canvas.height / 2,
  },
})(60);

// addPoints([...square, ...line, ...circle]);

draw();

// Write the word "Doka" on the canvas

// console.log('A', context.measureText('A'));
// console.log('a', context.measureText('a'));

// ------------------------------
// Editor
// ------------------------------

const playbackButton = document.getElementById('playback-toggle')!;
const pencilButton = document.getElementById('pencil-button')!;
const wandButton = document.getElementById('wand-button')!;
const lineButton = document.getElementById('line-button')!;
const squareButton = document.getElementById('square-button')!;
const circleButton = document.getElementById('circle-button')!;
const undoButton = document.getElementById('undo-button')!;
const redoButton = document.getElementById('redo-button')!;
const clearCanvasButton = document.getElementById('clear-canvas')!;

function updateToolbox() {
  if (isPlaying) {
    Array.prototype.forEach.call(
      document.getElementsByClassName('disabled-during-playback'),
      (element: HTMLElement) => {
        element.setAttribute('disabled', 'true');
      }
    );

    (playbackButton.children[0] as HTMLImageElement).src = './icons/pause.svg';
    playbackButton.classList.add('active');
  } else {
    Array.prototype.forEach.call(
      document.getElementsByClassName('disabled-during-playback'),
      (element: HTMLElement) => {
        element.removeAttribute('disabled');
      }
    );

    (playbackButton.children[0] as HTMLImageElement).src = './icons/play.svg';
    playbackButton.classList.remove('active');
  }

  if (isPlaying || allPoints.length === 0) {
    undoButton.setAttribute('disabled', 'true');
  } else {
    undoButton.removeAttribute('disabled');
  }

  if (isPlaying || redoList.length === 0) {
    redoButton.setAttribute('disabled', 'true');
  } else {
    redoButton.removeAttribute('disabled');
  }
}
updateToolbox();

canvas.addEventListener('click', () => {
  if (isPlaying) return;

  if (placeToPlot) {
    addPoints([placeToPlot]);
    lastDotPlaced = placeToPlot;
  } else {
    const mousePosition = { x: mouseX, y: mouseY };
    addPoints([mousePosition]);
    lastDotPlaced = mousePosition;
  }

  redoList.splice(0, redoList.length); // Clear the redo list

  updateToolbox();
});

// Release the cursor "lock" when tab is pressed
function releaseCursor() {
  lastDotPlaced = null;
}

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (!isPlaying && lastDotPlaced && event.key === 'r') releaseCursor();
});

// Undo/Redo buttons
function undo() {
  if (allPoints.length === 0) return;

  const pointToRemove = allPoints.findIndex(
    ({ index }) => index === allPoints.length - 1
  );
  redoList.push(allPoints.splice(pointToRemove, 1)[0]);

  if (allPoints.length === 0) releaseCursor();
  else if (placeToPlot) {
    // Move the cursor lock to the previously placed point
    lastDotPlaced = allPoints.find(
      ({ index }) => index === allPoints.length - 1
    )!;
  }

  updateToolbox();
}

undoButton.addEventListener('click', undo);
window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'z' && (event.ctrlKey || event.metaKey) && !event.shiftKey)
    undo();
});

function redo() {
  if (redoList.length === 0) return;

  const pointToAdd = redoList.pop()!;
  addPoints([pointToAdd]);

  lastDotPlaced = pointToAdd;

  updateToolbox();
}

redoButton.addEventListener('click', redo);
window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'z' && (event.ctrlKey || event.metaKey) && event.shiftKey)
    redo();
});

// Playback button
function togglePlayback() {
  isPlaying = !isPlaying;
  if (isPlaying) startOfTimeline = new Date();

  updateToolbox();
}

window.addEventListener(
  'keydown',
  (event: KeyboardEvent) => event.key === ' ' && togglePlayback()
);
playbackButton.addEventListener('click', togglePlayback);

// "Mode" buttons
function changeTool(tool: Tool) {
  const oldTool = document.getElementById(`${activeTool}-button`)!;
  oldTool.classList.remove('active');

  const oldToolIcon = oldTool.children[0] as HTMLImageElement;
  oldToolIcon.src = oldToolIcon.src.replace('-active.svg', '.svg');

  activeTool = tool;

  const newTool = document.getElementById(`${activeTool}-button`)!;
  newTool.classList.add('active');

  const newToolIcon = newTool.children[0] as HTMLImageElement;
  newToolIcon.src = newToolIcon.src.replace('.svg', '-active.svg');
}

// Make the default tool active
changeTool(activeTool);

pencilButton.addEventListener('click', () => changeTool('pencil'));
wandButton.addEventListener('click', () => changeTool('wand'));
lineButton.addEventListener('click', () => changeTool('line'));
squareButton.addEventListener('click', () => changeTool('square'));
circleButton.addEventListener('click', () => changeTool('circle'));

// Clear canvas button
function clearCanvas() {
  allPoints.splice(0, allPoints.length);
  releaseCursor();
  updateToolbox();
}
clearCanvasButton.addEventListener('click', clearCanvas);
