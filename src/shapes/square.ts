import { Point, ShapeFnConfig } from '~/types';

export default ({ dotSize, startingPoint }: ShapeFnConfig) =>
  (sideLengthInDots: number): Point[] => {
    if (sideLengthInDots === 0) return [];
    if (sideLengthInDots === 1) return [startingPoint];

    const adjustedDotSize = dotSize * 0.9; // This removes a small gap between the squiggles

    const points: Point[] = [];
    const sizeLength = adjustedDotSize * (sideLengthInDots - 1); // -1 because the dots' origins are centered

    for (let i = 0; i < sideLengthInDots; i++) {
      // Top side
      points.push({
        x: startingPoint.x - sizeLength / 2 + adjustedDotSize * i,
        y: startingPoint.y - sizeLength / 2,
      });

      // Right side
      points.push({
        x: startingPoint.x + sizeLength / 2,
        y: startingPoint.y - sizeLength / 2 + adjustedDotSize * i,
      });

      // Bottom side
      points.push({
        x: startingPoint.x + sizeLength / 2 - adjustedDotSize * i,
        y: startingPoint.y + sizeLength / 2,
      });

      // Left side
      points.push({
        x: startingPoint.x - sizeLength / 2,
        y: startingPoint.y + sizeLength / 2 - adjustedDotSize * i,
      });
    }

    return points;
  };
