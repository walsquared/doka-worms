import { Point, ShapeFnConfig } from '~/types';

export default ({ dotSize, startingPoint }: ShapeFnConfig) =>
  (radius: number): Point[] => {
    const circumference = 2 * Math.PI * radius;
    const spotsOnCircleEdge = Math.ceil(circumference / dotSize);

    const circle: Point[] = [];

    for (let i = 0; i < spotsOnCircleEdge; i++) {
      const theta = (i / spotsOnCircleEdge) * 2 * Math.PI;

      circle.push({
        x: startingPoint.x + Math.cos(theta) * radius,
        y: startingPoint.y + Math.sin(theta) * radius,
      });
    }
    return circle;
  };
