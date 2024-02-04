import { Point, ShapeFnConfig } from '~/types';

export default ({ dotSize, startingPoint }: ShapeFnConfig) =>
  /**
   * @param lengthInDots The number of dots to place on the line.
   * @param angleInDegrees An angle. Increase clockwise starting at 3 o'clock.
   */
  (lengthInDots: number, angleInDegrees: number): Point[] => {
    const adjustedDotSize = dotSize * 0.9;

    const line: Point[] = [];
    for (let i = 0; i < lengthInDots; i++) {
      line.push({
        x:
          startingPoint.x +
          Math.cos((angleInDegrees / 180) * Math.PI) * adjustedDotSize * i,
        y:
          startingPoint.y +
          Math.sin((angleInDegrees / 180) * Math.PI) * adjustedDotSize * i,
      });
    }
    return line;
  };
