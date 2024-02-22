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

// Pencil Tool variables
let lastDraggedPoint: Point | null = null;

// Wand Tool variables
let lastDotPlaced: Point | null = null;
let lastClickPosition: Point | null = null;
let placeToPlot: Point = { x: mouseX, y: mouseY };

// Line Tool variables
let placesToPlot: Point[] = [];

const { x: canvasX, y: canvasY } = canvas.getBoundingClientRect();

canvas.addEventListener('mousemove', (event: MouseEvent) => {
  mouseX = event.x - canvasX;
  mouseY = event.y - canvasY;
});

let isPlaying = true;
type Tool = 'pencil' | 'wand' | 'line';
let activeTool: Tool = 'pencil';

const WAVE_SPEED = 5;
const DOT_SIZE = 30;
// This is the distance between the centers of two dots to create pretty overlap
const AESTHETIC_DOT_DISTANCE = DOT_SIZE * 0.9;
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
  if (points.length === 0) return;

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

function drawTelegraphy(points: Point[]) {
  points.forEach((point) => {
    context.beginPath();
    context.strokeStyle = 'white';
    context.arc(point.x, point.y, DOT_SIZE / 2, 0, Math.PI * 2);
    context.stroke();
    context.closePath();
  });
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // testGradient();

  allPoints.forEach((point) => drawSquiggle(point.x, point.y));

  // ------------------------------
  // EDITOR
  // ------------------------------

  if (!isPlaying) {
    switch (activeTool) {
      case 'pencil': {
        drawTelegraphy([{ x: mouseX, y: mouseY }]);
        break;
      }
      case 'wand': {
        if (lastDotPlaced) {
          const theta = Math.atan2(
            mouseY - lastDotPlaced.y,
            mouseX - lastDotPlaced.x
          );

          placeToPlot = {
            x: lastDotPlaced.x + Math.cos(theta) * AESTHETIC_DOT_DISTANCE,
            y: lastDotPlaced.y + Math.sin(theta) * AESTHETIC_DOT_DISTANCE,
          };
        } else {
          placeToPlot = {
            x: mouseX,
            y: mouseY,
          };
        }

        drawTelegraphy([placeToPlot]);
        break;
      }
      case 'line': {
        if (placesToPlot.length !== 0) {
          placesToPlot = interpolatePointsToCursor(placesToPlot[0]);
          drawTelegraphy(placesToPlot.slice(1));
        } else {
          drawTelegraphy([{ x: mouseX, y: mouseY }]);
        }
        break;
      }
    }
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

canvas.addEventListener('mousedown', () => {
  if (isPlaying) return;

  switch (activeTool) {
    case 'pencil': {
      const mousePosition = { x: mouseX, y: mouseY };
      lastDraggedPoint = mousePosition;
      addPoints([mousePosition]);
      break;
    }
    case 'wand': {
      lastClickPosition = { x: mouseX, y: mouseY };

      if (placeToPlot) {
        addPoints([placeToPlot]);
        lastDotPlaced = placeToPlot;
      } else {
        const mousePosition = { x: mouseX, y: mouseY };
        addPoints([mousePosition]);
        lastDotPlaced = mousePosition;
      }

      redoList.splice(0, redoList.length); // Clear the redo list
      break;
    }
    case 'line': {
      if (placesToPlot.length !== 0) {
        addPoints(placesToPlot);
        placesToPlot.splice(0, placesToPlot.length - 1);
      } else {
        placesToPlot.push({ x: mouseX, y: mouseY });
        addPoints(placesToPlot);
      }

      redoList.splice(0, redoList.length); // Clear the redo list
      break;
    }
  }

  updateToolbox();
});

function interpolatePointsToCursor(startingPoint: Point) {
  const segments = [startingPoint];
  const calcRemainingDistanceToCursor = () => {
    const lastSegment = segments[segments.length - 1];

    return Math.sqrt(
      Math.pow(lastSegment.x - mouseX, 2) + Math.pow(lastSegment.y - mouseY, 2)
    );
  };

  while (calcRemainingDistanceToCursor() > AESTHETIC_DOT_DISTANCE) {
    const lastSegment = segments[segments.length - 1];
    const theta = Math.atan2(mouseY - lastSegment.y, mouseX - lastSegment.x);

    segments.push({
      x: lastSegment.x + Math.cos(theta) * AESTHETIC_DOT_DISTANCE,
      y: lastSegment.y + Math.sin(theta) * AESTHETIC_DOT_DISTANCE,
    });
  }

  return segments;
}

canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (isPlaying) return;

  switch (activeTool) {
    case 'pencil': {
      if (event.buttons === 1) {
        const mousePosition = { x: mouseX, y: mouseY };

        if (lastDraggedPoint === null) {
          addPoints([mousePosition]);
          lastDraggedPoint = mousePosition;
        } else {
          const missingPoints =
            interpolatePointsToCursor(lastDraggedPoint).slice(1);

          if (missingPoints.length > 0) {
            addPoints(missingPoints);
            lastDraggedPoint = missingPoints[missingPoints.length - 1];
          }
        }
      }
      break;
    }
    case 'wand': {
      if (event.buttons === 1 && lastClickPosition && lastDotPlaced) {
        const distanceTraveledFromLastClick = Math.sqrt(
          Math.pow(mouseX - lastClickPosition.x, 2) +
            Math.pow(mouseY - lastClickPosition.y, 2)
        );

        if (distanceTraveledFromLastClick > AESTHETIC_DOT_DISTANCE) {
          addPoints([placeToPlot]);
          lastDotPlaced = placeToPlot;
          lastClickPosition = { x: mouseX, y: mouseY };
        }
      }
    }
  }
});

// Release the cursor "lock" when R is pressed
function releaseCursor() {
  switch (activeTool) {
    case 'wand': {
      lastDotPlaced = null;
      return;
    }
    case 'line': {
      placesToPlot = [];
      return;
    }
  }
}

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (!isPlaying) {
    switch (event.key) {
      case 'r':
        return releaseCursor();
      case '1':
        return changeTool('pencil');
      case '2':
        return changeTool('wand');
      case '3':
        return changeTool('line');
    }
  }
});

// Undo/Redo buttons
function undo() {
  if (allPoints.length === 0) return;

  const pointToRemove = allPoints.findIndex(
    ({ index }) => index === allPoints.length - 1
  );
  redoList.push(allPoints.splice(pointToRemove, 1)[0]);

  const lastPoint = allPoints.find(
    ({ index }) => index === allPoints.length - 1
  )!;

  switch (activeTool) {
    case 'wand': {
      if (placeToPlot) {
        lastDotPlaced = lastPoint;
      }
      break;
    }
    case 'line': {
      if (placesToPlot.length !== 0) {
        placesToPlot = [lastPoint];
      }
      break;
    }
    default: {
      releaseCursor();
    }
  }

  updateToolbox();
}

undoButton.addEventListener('click', undo);

function redo() {
  if (redoList.length === 0) return;

  const pointToAdd = redoList.pop()!;
  addPoints([pointToAdd]);

  switch (activeTool) {
    case 'wand': {
      if (placeToPlot) {
        lastDotPlaced = pointToAdd;
      }
      break;
    }
    case 'line': {
      if (placesToPlot.length !== 0) {
        placesToPlot = [pointToAdd];
      }
      break;
    }
  }

  updateToolbox();
}

redoButton.addEventListener('click', redo);

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
    if (event.shiftKey) redo();
    else undo();
  }
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
  releaseCursor();

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

// Clear canvas button
function clearCanvas() {
  allPoints.splice(0, allPoints.length);
  redoList.splice(0, redoList.length);
  releaseCursor();
  updateToolbox();
}
clearCanvasButton.addEventListener('click', clearCanvas);
