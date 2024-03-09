// https://www.volkshotel.nl/content/uploads/2023/09/DOKA_SITE_v2.mp4
// In action: https://www.volkshotel.nl/en/doka
import { v4 as uuidv4 } from 'uuid';

import { Point } from './types';
import DokaJson from './doka-word.json';

import noiseImg from './noise.svg';

type PointWithId = Point & { id: string };
type OrderedPoint = PointWithId & { index: number };

const DOT_SIZE = 30;
// This is the distance between the centers of two dots to create pretty overlap
const AESTHETIC_DOT_DISTANCE = DOT_SIZE * 0.9;
const GRADIENT_STOPS = 3;

// I find multiplying the time by 1/20 to be a good speed for the animation
const TIME_RATIO = 1 / 20;

const NUM_SEGMENTS = 75;
const SEGMENT_LENGTH = 4;
// As this value increases, the worm becomes taller
const AMPLITUDE_MODIFIER = 45;
// As this value increases, the worm becomes longer
const FREQUENCY_MODIFIER = 35;
const PHASE_LENGTH = (2 * Math.PI * FREQUENCY_MODIFIER) / TIME_RATIO;

const canvas = document.getElementById('main-canvas')! as HTMLCanvasElement;
const context = canvas.getContext('2d')!;

let mouseX = 0;
let mouseY = 0;

canvas.addEventListener('mousemove', (event) => {
  const { x: canvasX, y: canvasY } = canvas.getBoundingClientRect();
  mouseX = event.x - canvasX;
  mouseY = event.y - canvasY;
});

// Playback state
let startOfTimeline = new Date();
let isPlaying = true;

type Tool = 'pencil' | 'wand' | 'line';
let activeTool: Tool = 'pencil';

// Pencil Tool state
let lastDraggedPoint: Point | null = null;

// Wand Tool state
let lastDotPlaced: Point | null = null;
let lastClickPosition: Point | null = null;
let placeToPlot: Point = { x: mouseX, y: mouseY };

// Line Tool state
let placesToPlot: Point[] = [];
let isSnapping = false;
let lineToSnapTo: 'x-axis' | 'y-axis' | 'p-diagonal' | 'n-diagonal' | 'none' =
  'none';
let firstLineSegment = true;

// History state
type Batch = {
  action: 'add' | 'remove';
  points: PointWithId[];
};
const batchedHistory: Array<Batch> = [];
let allPoints: OrderedPoint[] = DokaJson.map((point, index) => ({
  ...point,
  id: uuidv4(),
  index,
}));
const removedBatches: Array<Batch> = [];

/**
 * A function to be passed to Array.sort().
 * Points further left are considered greater so that they are drawn last (therefore on top).
 * For points with the same x value, pointers further down are considered greater.
 */
function orderPoints(pointA: Point, pointB: Point): number {
  return pointA.x === pointB.x ? pointA.y - pointB.y : pointB.x - pointA.x;
}

function deriveAllPointsFromHistory() {
  allPoints = batchedHistory
    .reduce((acc, batch) => {
      switch (batch.action) {
        case 'add': {
          return acc.concat(batch.points);
        }
        case 'remove': {
          return acc.filter(
            (point) =>
              !batch.points.some(
                (pointToRemove) => pointToRemove.id === point.id
              )
          );
        }
      }
    }, new Array<PointWithId>())
    .map((point, index) => ({ ...point, index }))
    .sort(orderPoints);
}

function addPoints(pointsToAdd: Point[], newBatch = true) {
  if (pointsToAdd.length === 0) return;

  if (newBatch || batchedHistory.length === 0) {
    batchedHistory.push({
      action: 'add',
      points: pointsToAdd.map((point) => ({ ...point, id: uuidv4() })),
    });
  } else {
    let latestBatch = batchedHistory.pop()!;
    batchedHistory.push({
      action: 'add',
      points: latestBatch.points.concat(
        pointsToAdd.map((point) => ({ ...point, id: uuidv4() }))
      ),
    });
  }

  // Limit on length of history
  if (batchedHistory.length > 25) batchedHistory.shift();

  // Remove any redo history
  removedBatches.splice(0, removedBatches.length);

  deriveAllPointsFromHistory();
}

function removePoints(pointsToRemove: PointWithId[]) {
  if (pointsToRemove.length === 0) return;

  batchedHistory.push({ action: 'remove', points: pointsToRemove });

  // Limit on length of history
  if (batchedHistory.length > 25) batchedHistory.shift();

  deriveAllPointsFromHistory();
}

function calcSegYValue(segX: number, animationPos: number): number {
  return (
    AMPLITUDE_MODIFIER * Math.sin((segX + animationPos) / FREQUENCY_MODIFIER)
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
  const gradientAnimationOffset =
    Math.sin(animationPosition / FREQUENCY_MODIFIER + 10) * 100;
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

function drawSquiggle(
  startX: number,
  startY: number,
  animationPosition: number
) {
  context.save();

  context.beginPath();
  context.moveTo(startX, startY + calcSegYValue(0, animationPosition));
  context.lineWidth = DOT_SIZE;
  context.lineCap = 'round';

  // Draw the squiggle
  for (let segmentIndex = 0; segmentIndex < NUM_SEGMENTS; segmentIndex++) {
    const segmentX = segmentIndex * SEGMENT_LENGTH;
    context.lineTo(
      // The wave isn't moving left/right, so we don't need to use animationPosition for the x value
      startX - segmentX,
      startY + calcSegYValue(segmentX, animationPosition)
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

const img = new Image();
img.src = noiseImg;
let isLoaded = false;
img.onload = () => {
  isLoaded = true;
};

let compositor = document.createElement('canvas');
let cctx = compositor.getContext('2d')!;
compositor.width = canvas.width;
compositor.height = canvas.height;

function drawNoise() {
  if (!isLoaded) return;

  // Only use the image after it's loaded
  const pattern = context.createPattern(img, 'repeat')!;

  cctx.drawImage(canvas, 0, 0);
  cctx.globalCompositeOperation = 'lighter';
  cctx.fillStyle = pattern;
  cctx.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = 'source-in';
  context.drawImage(compositor, 0, 0);

  context.globalCompositeOperation = 'source-over';
  cctx.globalCompositeOperation = 'source-over';
}

function draw() {
  // Time since start of animation, multiplied by a factor to make it configurable
  const now = new Date();
  const animationPosition = !isPlaying
    ? 0
    : (now.getTime() - startOfTimeline.getTime()) * TIME_RATIO;

  context.clearRect(0, 0, canvas.width, canvas.height);

  // testGradient();

  allPoints.forEach((point) =>
    drawSquiggle(point.x, point.y, animationPosition)
  );

  drawNoise();
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

draw();

// Write the word "Doka" on the canvas

// console.log('A', context.measureText('A'));
// console.log('a', context.measureText('a'));

// ------------------------------
// Editor
// ------------------------------
const startButton = document.getElementById('start-button')!;
const toolbox = document.getElementById('toolbox')!;

startButton.addEventListener('click', () => {
  toolbox.classList.remove('hidden');
  startButton.classList.add('hidden');
  isPlaying = false;
  deriveAllPointsFromHistory();
  updateToolbox();
});

const playbackButton = document.getElementById('playback-toggle')!;
const pencilButton = document.getElementById('pencil-button')!;
const wandButton = document.getElementById('wand-button')!;
const lineButton = document.getElementById('line-button')!;
const undoButton = document.getElementById('undo-button')!;
const redoButton = document.getElementById('redo-button')!;
const clearCanvasButton = document.getElementById('clear-canvas')!;
const exportButton = document.getElementById('export-button')!;

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

  if (isPlaying || batchedHistory.length === 0) {
    undoButton.setAttribute('disabled', 'true');
  } else {
    undoButton.removeAttribute('disabled');
  }

  if (isPlaying || removedBatches.length === 0) {
    redoButton.setAttribute('disabled', 'true');
  } else {
    redoButton.removeAttribute('disabled');
  }

  if (allPoints.length === 0) {
    exportButton.setAttribute('disabled', 'true');
  } else {
    exportButton.removeAttribute('disabled');
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

      removedBatches.splice(0, removedBatches.length); // Clear the redo list
      break;
    }
    case 'line': {
      if (placesToPlot.length !== 0) {
        addPoints(placesToPlot, !firstLineSegment);
        placesToPlot = [placesToPlot[placesToPlot.length - 1]];
        firstLineSegment = false;
      } else {
        placesToPlot.push({ x: mouseX, y: mouseY });
        addPoints(placesToPlot);
        firstLineSegment = true;
      }

      removedBatches.splice(0, removedBatches.length); // Clear the redo list
      break;
    }
  }

  updateToolbox();
});

function interpolatePointsToCursor(startingPoint: Point) {
  const segments = [startingPoint];
  const calcRemainingDistanceToCursor = () => {
    const lastSegment = segments[segments.length - 1];

    switch (lineToSnapTo) {
      case 'none': {
        return Math.sqrt(
          Math.pow(mouseX - lastSegment.x, 2) +
            Math.pow(mouseY - lastSegment.y, 2)
        );
      }
      case 'x-axis': {
        return Math.abs(mouseX - lastSegment.x);
      }
      case 'y-axis': {
        return Math.abs(mouseY - lastSegment.y);
      }
      case 'p-diagonal':
      case 'n-diagonal': {
        const rise = mouseY - lastSegment.y;
        const run = mouseX - lastSegment.x;
        const shortestSide = Math.min(Math.abs(rise), Math.abs(run));
        return Math.sqrt(Math.pow(shortestSide, 2) + Math.pow(shortestSide, 2));
      }
    }
  };

  while (calcRemainingDistanceToCursor() >= AESTHETIC_DOT_DISTANCE) {
    const lastSegment = segments[segments.length - 1];
    const theta = Math.atan2(mouseY - lastSegment.y, mouseX - lastSegment.x);

    switch (lineToSnapTo) {
      case 'none': {
        segments.push({
          x: lastSegment.x + Math.cos(theta) * AESTHETIC_DOT_DISTANCE,
          y: lastSegment.y + Math.sin(theta) * AESTHETIC_DOT_DISTANCE,
        });
        break;
      }
      case 'x-axis': {
        const direction =
          theta < (1 / 2) * Math.PI && theta > (-1 / 2) * Math.PI ? 1 : -1;
        segments.push({
          x: lastSegment.x + AESTHETIC_DOT_DISTANCE * direction,
          y: lastSegment.y,
        });
        break;
      }
      case 'y-axis': {
        const direction = theta > 0 ? 1 : -1;
        segments.push({
          x: lastSegment.x,
          y: lastSegment.y + AESTHETIC_DOT_DISTANCE * direction,
        });
        break;
      }
      case 'p-diagonal': {
        const roundedTheta =
          theta > (-1 / 4) * Math.PI && theta < (3 / 4) * Math.PI
            ? (1 / 4) * Math.PI
            : (-3 / 4) * Math.PI;
        segments.push({
          x: lastSegment.x + Math.cos(roundedTheta) * AESTHETIC_DOT_DISTANCE,
          y: lastSegment.y + Math.sin(roundedTheta) * AESTHETIC_DOT_DISTANCE,
        });
        break;
      }
      case 'n-diagonal': {
        const roundedTheta =
          theta < (1 / 4) * Math.PI && theta > (-3 / 4) * Math.PI
            ? (-1 / 4) * Math.PI
            : (3 / 4) * Math.PI;
        segments.push({
          x: lastSegment.x + Math.cos(roundedTheta) * AESTHETIC_DOT_DISTANCE,
          y: lastSegment.y + Math.sin(roundedTheta) * AESTHETIC_DOT_DISTANCE,
        });
        break;
      }
    }
  }

  return Array.from(segments);
}

canvas.addEventListener('mousemove', (event) => {
  if (isPlaying) return;

  switch (activeTool) {
    case 'pencil': {
      if (event.buttons !== 1) return;

      const mousePosition = { x: mouseX, y: mouseY };

      if (lastDraggedPoint === null) {
        addPoints([mousePosition]);
        lastDraggedPoint = mousePosition;
      } else {
        const missingPoints =
          interpolatePointsToCursor(lastDraggedPoint).slice(1);

        if (missingPoints.length === 0) return;

        addPoints(missingPoints, false);
        lastDraggedPoint = missingPoints[missingPoints.length - 1];
      }

      return;
    }
    case 'wand': {
      if (event.buttons !== 1 || !lastClickPosition || !lastDotPlaced) return;

      const distanceTraveledFromLastClick = Math.sqrt(
        Math.pow(mouseX - lastClickPosition.x, 2) +
          Math.pow(mouseY - lastClickPosition.y, 2)
      );

      if (distanceTraveledFromLastClick <= AESTHETIC_DOT_DISTANCE) return;

      addPoints([placeToPlot], false);
      lastDotPlaced = placeToPlot;
      lastClickPosition = { x: mouseX, y: mouseY };

      return;
    }
    case 'line': {
      if (placesToPlot.length === 0) return;
      if (!isSnapping) {
        lineToSnapTo = 'none';
        return;
      }
      const rise = mouseY - placesToPlot[0].y;
      const run = mouseX - placesToPlot[0].x;
      const slope =
        run === 0
          ? rise > 0
            ? Infinity
            : rise < 0
            ? -Infinity
            : 0
          : rise / run;

      if (slope >= -0.5 && slope <= 0.5) lineToSnapTo = 'x-axis';
      else if (slope >= 2 || slope <= -2) lineToSnapTo = 'y-axis';
      else if (slope > 0) lineToSnapTo = 'p-diagonal';
      else lineToSnapTo = 'n-diagonal';

      return;
    }
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
  (event) => event.key === ' ' && togglePlayback()
);
playbackButton.addEventListener('click', togglePlayback);

// Release the cursor "lock" when R is pressed
function releaseCursor() {
  switch (activeTool) {
    case 'wand': {
      lastDotPlaced = null;
      return;
    }
    case 'line': {
      placesToPlot = [];
      firstLineSegment = true;
      return;
    }
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'r') releaseCursor();
});

function restoreSoftLock() {
  const lastPoint = allPoints.find(
    ({ index }) => index === allPoints.length - 1
  );

  if (!lastPoint) return releaseCursor();

  switch (activeTool) {
    case 'wand': {
      if (!placeToPlot) return releaseCursor();

      lastDotPlaced = lastPoint;
      break;
    }
    case 'line': {
      if (placesToPlot.length === 0) return releaseCursor();

      placesToPlot = [lastPoint];
      break;
    }
  }
}

// Line tool
window.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') {
    isSnapping = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') {
    isSnapping = false;
  }
});

// Undo/Redo buttons
function undo() {
  if (batchedHistory.length === 0) return;

  const deletedBatch = batchedHistory.pop()!;
  removedBatches.push(deletedBatch);

  deriveAllPointsFromHistory();

  restoreSoftLock();

  updateToolbox();
}

undoButton.addEventListener('click', undo);

function redo() {
  if (removedBatches.length === 0) return;

  const batchToRedo = removedBatches.pop()!;
  batchedHistory.push(batchToRedo);

  deriveAllPointsFromHistory();

  restoreSoftLock();

  updateToolbox();
}

redoButton.addEventListener('click', redo);

window.addEventListener('keydown', (event) => {
  if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
    if (event.shiftKey) redo();
    else undo();
  }
});

// Tool buttons
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

window.addEventListener('keydown', (event) => {
  if (!isPlaying) {
    switch (event.key) {
      case '1':
        return changeTool('pencil');
      case '2':
        return changeTool('wand');
      case '3':
        return changeTool('line');
    }
  }
});

pencilButton.addEventListener('click', () => changeTool('pencil'));
wandButton.addEventListener('click', () => changeTool('wand'));
lineButton.addEventListener('click', () => changeTool('line'));

// Clear canvas button
function clearCanvas() {
  removePoints(allPoints);
  releaseCursor();
  updateToolbox();
}
clearCanvasButton.addEventListener('click', clearCanvas);

// ------------------------------
// Exporting
// https://stackoverflow.com/questions/19235286/convert-html5-canvas-sequence-to-a-video-file

const loadingSpinner = document.getElementById('loading-spinner')!;
const downloadButton = document.getElementById('download-button')!;

function createVideoOfCanvas(time: number): Promise<string> {
  const recordedChunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    mediaRecorder.start(time);

    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size === 0) return;
      recordedChunks.push(event.data);
      if (mediaRecorder.state === 'recording') mediaRecorder.stop();
    });

    mediaRecorder.addEventListener('stop', () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve(url);
    });
  });
}

exportButton.addEventListener('click', async () => {
  isPlaying = true;
  startOfTimeline = new Date();
  exportButton.classList.remove('has-explicit-visibility');
  loadingSpinner.classList.add('has-explicit-visibility');

  Array.prototype.forEach.call(
    document.getElementsByClassName('toolbox-item'),
    (element: HTMLElement) => {
      element.setAttribute('disabled', 'true');
    }
  );

  const url = await createVideoOfCanvas(PHASE_LENGTH);

  Array.prototype.forEach.call(
    document.getElementsByClassName('toolbox-item'),
    (element: HTMLElement) => {
      element.removeAttribute('disabled');
    }
  );

  downloadButton.setAttribute('href', url);
  window.URL.revokeObjectURL(url);

  loadingSpinner.classList.remove('has-explicit-visibility');
  downloadButton.classList.add('has-explicit-visibility');
});

downloadButton.addEventListener('click', () => {
  downloadButton.classList.remove('has-explicit-visibility');
  exportButton.classList.add('has-explicit-visibility');
});
