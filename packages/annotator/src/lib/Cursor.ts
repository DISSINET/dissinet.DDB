import { DrawingOptions } from "./Annotator";
import Highlighter, {
  CursorStyle,
  defaultStyle,
  IAbsCoordinates,
  IRelativeCoordinates,
} from "./Highlighter";
import Viewport from "./Viewport";
import { EditMode, HighlightMode } from "./constants";

export enum DIRECTION {
  FORWARD = "FORWARD",
  BACKWARD = "BACKWARD",
}
/**
 * Cursor represents active position in the viewport with highlighting capabilities (marking start - end in absolute coordinates)
 */
export default class Cursor
  extends Highlighter
  implements IRelativeCoordinates
{
  // relative!
  xLine: number;
  yLine: number;

  selectDirection?: DIRECTION;

  // highlighted area must use absolute coordinates - highlighted area stays in position while scrolling
  private selecting: boolean = false;

  constructor(ratio: number, xLine: number = -1, yLine: number = -1) {
    super(ratio, defaultStyle, HighlightMode.SELECT);
    this.xLine = xLine;
    this.yLine = yLine;
    this.style = { ...this.style, color: "black" };
  }

  setTrueSelectionDirection() {
    if (this.selectStart && this.selectEnd) {
      if (this.selectStart.yLine < this.selectEnd.yLine) {
        // start is above end
        this.selectDirection = DIRECTION.FORWARD;
        return;
      } else if (this.selectStart.yLine > this.selectEnd.yLine) {
        // start is below end
        this.selectDirection = DIRECTION.BACKWARD;
        return;
      } else {
        // the same line
        if (this.selectStart.xLine < this.selectEnd.xLine) {
          // start is before end on horizontal axis
          this.selectDirection = DIRECTION.FORWARD;
          return;
        } else if (this.selectStart.xLine > this.selectEnd.xLine) {
          // start is after end on horizontal axis
          this.selectDirection = DIRECTION.BACKWARD;
          return;
        }
      }
    }

    this.selectDirection = undefined;
  }

  getSelectionDirection(): DIRECTION | undefined {
    if (this.selectStart && this.selectEnd) {
      return this.selectDirection;
    }

    return undefined;
  }

  setPosition(lineX: number, lineY: number) {
    this.xLine = lineX;
    this.yLine = lineY;
  }

  setPositionFromEvent(evt: MouseEvent, lineHeight: number, charWidth: number) {
    this.xLine = this.xToCharI(evt.offsetX, charWidth);
    this.yLine = this.yToLineI(evt.offsetY, lineHeight);
  }

  /**
   * isSelecting is predicate for testing if any mouse-move event should update selected area (click+move)
   * @returns
   */
  isSelecting(): boolean {
    return this.selecting;
  }

  /**
   * isSelected is predicate for testing if selected area has been set - should be drawn
   * @returns
   */
  isSelected(): boolean {
    return (
      !!this.selectStart &&
      !!this.selectEnd &&
      (this.selectStart.xLine !== this.selectEnd.xLine ||
        this.selectStart.yLine !== this.selectEnd.yLine)
    );
  }

  /**
   * getSelectedArea return null if area is empty (no char selected)
   * @returns
   */
  getSelectedArea(): [IAbsCoordinates, IAbsCoordinates] | null {
    const selected = this.getBounds();
    if (
      selected[0] === undefined ||
      selected[1] === undefined ||
      (selected[0].xLine === selected[1].xLine &&
        selected[0].yLine === selected[1].yLine)
    ) {
      return null;
    }

    return [selected[0], selected[1]];
  }

  /**
   * getSelected is getter for absolute selected coordinates
   * @returns
   */
  getBounds(): [IAbsCoordinates | undefined, IAbsCoordinates | undefined] {
    if (!this.selectStart || !this.selectEnd) {
      return [undefined, undefined];
    }

    if (
      this.selectStart.yLine < this.selectEnd.yLine ||
      (this.selectStart.yLine === this.selectEnd.yLine &&
        this.selectStart.xLine < this.selectEnd.xLine)
    ) {
      return [this.selectStart, this.selectEnd];
    } else {
      return [this.selectEnd, this.selectStart];
    }
  }

  /**
   * selectArea updates selected area's coordinates, either both start/end (set initial position) or just end (moving)
   * @param yOffset
   */
  selectArea(yOffset: number) {
    if (!this.selecting) {
      this.selectStart = { xLine: this.xLine, yLine: yOffset + this.yLine };
      this.selectEnd = { xLine: this.xLine, yLine: yOffset + this.yLine };
      this.selecting = true;
    } else {
      this.selectEnd = { xLine: this.xLine, yLine: yOffset + this.yLine };
    }

    // test direction from selectArea call
    this.setTrueSelectionDirection();
  }

  /**
   * endHighlight marks final position for highlighted area by setting control flag to false
   */
  endSelection() {
    this.selecting = false;
  }

  /**
   * move alters the cursor position by provided delta increments
   * @param xDelta
   * @param yDelta
   * @returns
   */
  move(xDelta: number, yDelta: number) {
    if (!xDelta && !yDelta) {
      return;
    }

    let newX = this.xLine + xDelta;
    let newY = this.yLine + yDelta;

    if (newX < 0) {
      newX = 0;
    }
    if (newY < 0) {
      newY = 0;
    }

    this.xLine = newX;
    this.yLine = newY;
  }

  /**
   * move the cursor to start of the next line
   */
  moveToNewline() {
    this.xLine = 0;
    this.yLine += 1;
  }

  /**
   * draw places cursor and optionally highlighted area into the canvas
   * @param ctx
   * @param viewport
   * @param text
   * @param options
   * @returns
   */
  draw(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    textLines: string[],
    drawingOptions: DrawingOptions,
    editMode: EditMode
  ) {
    if (this.xLine === -1 && this.yLine === -1) {
      return;
    }

    let [hStart, hEnd] = this.getBounds();

    const rowsToDraw: { rowI: number; start: number; end: number }[] = [];

    if (!this.isSelected()) {
      // in case there is no area selected, just drop a cursor at some
      this.drawLine(ctx, this.yLine, this.xLine, this.xLine, {
        ...drawingOptions,
        color: "black",
      });
    } else if (hStart && hEnd) {
      // selection active, iterate over displayed lines
      for (
        let i = 0;
        i < Math.min(viewport.lineEnd, textLines.length) - viewport.lineStart;
        i++
      ) {
        const currY = viewport.lineStart + i;
        const lastCharX = textLines[currY].length;

        if (hStart.yLine <= currY && hEnd.yLine >= currY) {
          if (hStart.yLine === currY) {
            // opening highlight line
            rowsToDraw.push({
              rowI: i,
              start: hStart.xLine,
              end: hStart.yLine === hEnd.yLine ? hEnd.xLine : lastCharX + 1,
            });
          } else if (hEnd.yLine === currY) {
            // closing highlight line
            rowsToDraw.push({ rowI: i, start: 0, end: hEnd.xLine });
          } else {
            // full line highlight (between open & end)
            rowsToDraw.push({
              rowI: i,
              start: 0,
              end: lastCharX + 1,
            });
          }
        }
      }

      // draw selections or cursor
      for (const row of rowsToDraw) {
        this.drawLine(ctx, row.rowI, row.start, row.end, drawingOptions);
      }
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Reset the cursor properties - removes highlighting / cursor pointer
   */
  reset() {
    this.selectStart = undefined;
    this.selectEnd = undefined;
    this.xLine = -1;
    this.yLine = -1;
  }

  static fromPosition(pos: IAbsCoordinates): Cursor {
    return new Cursor(0, pos.xLine, pos.yLine);
  }

  getAbsolutePosition(viewport: Viewport): IAbsCoordinates {
    return {
      xLine: this.xLine,
      yLine: this.yLine + viewport.lineStart,
    };
  }
}
