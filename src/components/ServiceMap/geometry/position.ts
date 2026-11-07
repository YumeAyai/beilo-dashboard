export class Position {
  public static Top = Position.new(0b100000);
  public static Middle = Position.new(0b010000);
  public static Bottom = Position.new(0b001000);
  public static Left = Position.new(0b000001);
  public static Center = Position.new(0b000010);
  public static Right = Position.new(0b000100);

  public static TopLeft = Position.new(+Position.Top | +Position.Left);
  public static TopRight = Position.new(+Position.Top | +Position.Right);
  public static TopCenter = Position.new(+Position.Top | +Position.Center);
  public static MiddleLeft = Position.new(+Position.Middle | +Position.Left);
  public static MiddleRight = Position.new(+Position.Middle | +Position.Right);
  public static MiddleCenter = Position.new(+Position.Middle | +Position.Center);
  public static BottomLeft = Position.new(+Position.Bottom | +Position.Left);
  public static BottomRight = Position.new(+Position.Bottom | +Position.Right);
  public static BottomCenter = Position.new(+Position.Bottom | +Position.Center);

  public static new(n: number): Position {
    return new Position(n);
  }

  private n: number;

  constructor(n: number) {
    this.n = n;
  }

  [Symbol.toPrimitive](hint = 'number') {
    if (hint !== 'string') return this.n;

    return this.toString();
  }

  public valueOf() {
    return this[Symbol.toPrimitive]();
  }

  public toString() {
    let s = '';

    if (this.top) {
      s = 'Top' + s;
    }

    if (this.middle) {
      s = 'Middle' + s;
    }

    if (this.bottom) {
      s = 'Bottom' + s;
    }

    if (this.left) {
      s += 'Left';
    }

    if (this.center) {
      s += 'Center';
    }

    if (this.right) {
      s += 'Right';
    }

    return s;
  }

  public get x(): number {
    return this.n & 0b111;
  }

  public get top(): boolean {
    return (this.n & +Position.Top) > 0;
  }

  public get middle(): boolean {
    return (this.n & +Position.Middle) > 0;
  }

  public get bottom(): boolean {
    return (this.n & +Position.Bottom) > 0;
  }

  public get left(): boolean {
    return (this.n & +Position.Left) > 0;
  }

  public get center(): boolean {
    return (this.n & +Position.Center) > 0;
  }

  public get right(): boolean {
    return (this.n & +Position.Right) > 0;
  }

  public get topLeft(): boolean {
    return (this.n & +Position.TopLeft) > 0;
  }

  public get topCenter(): boolean {
    return (this.n & +Position.TopCenter) > 0;
  }

  public get topRight(): boolean {
    return (this.n & +Position.TopRight) > 0;
  }

  public get bottomLeft(): boolean {
    return (this.n & +Position.BottomLeft) > 0;
  }

  public get bottomCenter(): boolean {
    return (this.n & +Position.BottomCenter) > 0;
  }

  public get bottomRight(): boolean {
    return (this.n & +Position.BottomRight) > 0;
  }

  public get middleCenter(): boolean {
    return this.center;
  }
}