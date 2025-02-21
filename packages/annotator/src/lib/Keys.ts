import { EditMode } from "./constants";
import Cursor, { DIRECTION } from "./Cursor";
import Text from "./Text";
import Viewport from "./Viewport";

enum Key {
  CapsLock = "CapsLock",
  Shift = "Shift",
  Control = "Control",
  Alt = "Alt",
  Tab = "Tab",
  Escape = "Escape",
  Enter = "Enter",
  Delete = "Delete",
  Home = "Home",
  End = "End",
  Meta = "Meta",
  PageUp = "PageUp",
  PageDown = "PageDown",
  Fn = "Fn",
  FnLock = "FnLock",
  NumLock = "NumLock",
  ScrollLock = "ScrollLock",
  Backspace = "Backspace",
  ArrowUp = "ArrowUp",
  ArrowDown = "ArrowDown",
  ArrowLeft = "ArrowLeft",
  ArrowRight = "ArrowRight",
}

export interface AnnotatorCallbacks {
  onTextChangeCb?: (text: string) => void;
  onCopyText(): void;
  onPasteText(): void;
  draw(): void;
  width: number;
  charWidth: number;
  cursor: Cursor;
  viewport: Viewport;
  text: Text;
  element: HTMLCanvasElement;
}

export default class Keys {
  static nonCharKeys = [
    Key.CapsLock,
    Key.Shift,
    Key.Control,
    Key.Alt,
    Key.Tab,
    Key.Escape,
    Key.Enter,
    Key.Delete,
    Key.Meta,
    Key.PageUp,
    Key.PageDown,
    Key.Fn,
    Key.FnLock,
    Key.NumLock,
    Key.ScrollLock,
    Key.End,
    Key.Home,
  ];

  annotator: AnnotatorCallbacks;

  cursor: Cursor;
  viewport: Viewport;
  text: Text;

  constructor(annotatorBackfill: AnnotatorCallbacks) {
    this.annotator = annotatorBackfill;
    this.cursor = this.annotator.cursor;
    this.viewport = this.annotator.viewport;
    this.text = this.annotator.text;

    this.annotator.element.onkeydown = this.onKeyDown.bind(this);
  }

  onKeyHome({ ctrlKey, shiftKey }: { ctrlKey?: boolean; shiftKey?: boolean }) {
    const originalXLine = this.cursor.xLine;
    const originalAbsYLine = this.viewport.lineStart + this.cursor.yLine;

    // always start of line
    this.cursor.xLine = 0;

    if (ctrlKey) {
      // move to top line
      this.cursor.yLine = 0;
      this.viewport.lineStart = 0;
    }

    if (shiftKey) {
      if (this.cursor.selectDirection === undefined) {
        this.cursor.selectStart = {
          xLine: originalXLine,
          yLine: originalAbsYLine,
        };
      }
      this.cursor.selectEnd = {
        xLine: 0,
        yLine: this.viewport.lineStart + this.cursor.yLine,
      };
    } else {
      this.cursor.selectStart = undefined;
      this.cursor.selectEnd = undefined;
    }

    this.cursor.setTrueSelectionDirection();
  }

  onKeyEnd({ ctrlKey, shiftKey }: { ctrlKey?: boolean; shiftKey?: boolean }) {
    const originalXLine = this.cursor.xLine;
    const originalAbsYLine = this.viewport.lineStart + this.cursor.yLine;

    if (ctrlKey) {
      // use last viewport line + scroll to last line using viewport
      this.cursor.yLine = this.viewport.noLines - 1;
      this.viewport.scrollTo(this.text.noLines, this.text.noLines);
    }

    // use end of final line
    const line = this.text.getCurrentLine(this.viewport, this.cursor) || "";
    this.cursor.xLine = line.length;

    if (shiftKey) {
      if (this.cursor.selectDirection === undefined) {
        this.cursor.selectStart = {
          xLine: originalXLine,
          yLine: originalAbsYLine,
        };
      }
      this.cursor.selectEnd = {
        xLine: this.cursor.xLine,
        yLine: this.viewport.lineStart + this.cursor.yLine,
      };
    } else {
      this.cursor.selectStart = undefined;
      this.cursor.selectEnd = undefined;
    }

    this.cursor.setTrueSelectionDirection();
  }

  onKeyBackspace({
    ctrlKey,
    shiftKey,
  }: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
  }) {
    if (this.text.mode === EditMode.HIGHLIGHT) {
      return;
    }

    const area = this.cursor.getSelectedArea();
    if (area) {
      this.text.deleteRangeText(area[0], area[1]);
      this.cursor.reset();
      this.cursor.setPosition(
        area[0].xLine,
        area[0].yLine - this.viewport.lineStart
      );
    } else {
      const before = this.cursor.getAbsolutePosition(this.viewport);
      this.onArrowLeft({ ctrlKey, shiftKey });
      const after = this.cursor.getAbsolutePosition(this.viewport);

      this.text.deleteRangeText(before, after);

      if (this.annotator.onTextChangeCb) {
        this.annotator.onTextChangeCb(this.text.value);
      }
    }
  }

  onKeyDelete({
    ctrlKey,
    shiftKey,
  }: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
  }) {
    if (this.text.mode === EditMode.HIGHLIGHT) {
      return;
    }

    const area = this.cursor.getSelectedArea();
    if (area) {
      this.text.deleteRangeText(area[0], area[1]);
      this.cursor.reset();
      this.cursor.setPosition(
        area[0].xLine,
        area[0].yLine - this.viewport.lineStart
      );
    } else {
      const before = this.cursor.getAbsolutePosition(this.viewport);
      this.onArrowRight({ ctrlKey, shiftKey });
      const after = this.cursor.getAbsolutePosition(this.viewport);

      this.text.deleteRangeText(before, after);
      this.cursor.xLine = before.xLine;
      this.cursor.yLine = before.yLine - this.viewport.lineStart;

      if (this.annotator.onTextChangeCb) {
        this.annotator.onTextChangeCb(this.text.value);
      }
    }
  }

  onKeyPgUp({ ctrlKey, shiftKey }: { ctrlKey?: boolean; shiftKey?: boolean }) {
    const originalViewport = this.viewport.lineStart;
    this.viewport.scrollUp(this.viewport.noLines);

    if (originalViewport === this.viewport.lineStart) {
      this.cursor.yLine = 0;
      this.cursor.xLine = 0;
    }

    if (shiftKey) {
      this.cursor.selectEnd = {
        xLine: this.cursor.xLine,
        yLine: this.viewport.lineStart + this.cursor.yLine,
      };
    } else {
      this.cursor.selectStart = undefined;
      this.cursor.selectEnd = undefined;
    }

    this.cursor.setTrueSelectionDirection();
  }

  onKeyPgDown({
    ctrlKey,
    shiftKey,
  }: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
  }) {
    const originalViewport = this.viewport.lineStart;
    this.viewport.scrollDown(this.viewport.noLines, this.text.noLines);

    if (originalViewport === this.viewport.lineStart) {
      this.cursor.yLine = this.viewport.noLines - 1;
    }
    const line = this.text.getCurrentLine(this.viewport, this.cursor) || "";
    if (line.length < this.cursor.xLine) {
      this.cursor.xLine = line.length;
    }

    if (shiftKey) {
      this.cursor.selectEnd = {
        xLine: this.cursor.xLine,
        yLine:
          originalViewport === this.viewport.lineStart
            ? this.viewport.lineStart + this.viewport.noLines
            : this.viewport.lineStart + this.cursor.yLine,
      };
    } else {
      this.cursor.selectStart = undefined;
      this.cursor.selectEnd = undefined;
    }

    this.cursor.setTrueSelectionDirection();
  }

  onKeyEnter() {
    if (this.text.mode === EditMode.HIGHLIGHT) {
      return;
    }
    this.text.insertNewline(this.viewport, this.cursor);
    this.cursor.moveToNewline();
    if (!this.text.cursorToIndex(this.viewport, this.cursor)) {
      this.cursor.move(0, -1);
    }
  }

  onArrowUp({ ctrlKey, shiftKey }: { ctrlKey?: boolean; shiftKey?: boolean }) {
    const originalXLine = this.cursor.xLine;
    const originalAbsYline = this.viewport.lineStart + this.cursor.yLine;

    if (this.cursor.yLine <= 0) {
      // scroll up if going outside of the viewport
      this.viewport.scrollTo(this.viewport.lineStart - 1, this.text.noLines);
      this.cursor.yLine = 0;
    }

    const isAbsTopLine = this.cursor.yLine + this.viewport.lineStart === 0;
    if (isAbsTopLine) {
      // if top line - move to start of the line
      this.cursor.xLine = 0;
    } else {
      // move cursor up
      this.cursor.move(0, -1);
    }

    // cursor should not go being line bounds (right side)
    const line = this.text.getCurrentLine(this.viewport, this.cursor) || "";
    if (line.length < this.cursor.xLine) {
      this.cursor.xLine = line.length;
    }

    if (shiftKey) {
      if (this.cursor.selectDirection === DIRECTION.FORWARD) {
        // copy cursor's current position as selectEnd - going forward & using up arrow key => reduce area
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      } else if (this.cursor.selectDirection === DIRECTION.BACKWARD) {
        // copy cursor's current position as selectEnd - going forward & using up arrow key => increase area
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      } else {
        // select area not used yet - using up arrow:
        // - start = original cursor position
        // - end = current cursor position
        this.cursor.selectStart = {
          xLine: originalXLine, // use original without alteration!
          yLine: originalAbsYline,
        };
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      }
    } else {
      this.cursor.selectStart = undefined;
      this.cursor.selectEnd = undefined;
    }

    this.cursor.setTrueSelectionDirection();
  }

  onArrowDown({
    ctrlKey,
    shiftKey,
  }: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
  }) {
    const originalXLine = this.cursor.xLine;
    const originalAbsYline = this.viewport.lineStart + this.cursor.yLine;

    this.cursor.move(0, 1);

    // if yLine is out of viewport => scroll down
    if (this.cursor.yLine + this.viewport.lineStart > this.viewport.lineEnd) {
      this.viewport.scrollTo(this.viewport.lineStart + 1, this.text.noLines);
      this.cursor.yLine = this.viewport.lineEnd - this.viewport.lineStart;
    }

    const line = this.text.getCurrentLine(this.viewport, this.cursor) || "";

    // if out of lines - use last line's setup (last x char)
    if (this.cursor.yLine + this.viewport.lineStart >= this.text.noLines) {
      this.cursor.yLine = this.text.noLines - this.viewport.lineStart - 1;
      this.cursor.xLine = line.length;
    }

    // cursor should not go being line bounds (right side)
    if (line.length < this.cursor.xLine) {
      this.cursor.xLine = line.length;
    }

    if (shiftKey) {
      if (this.cursor.selectDirection === DIRECTION.FORWARD) {
        // copy cursor's current position as selectEnd - going forward & using down arrow key => increase area
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      } else if (this.cursor.selectDirection === DIRECTION.BACKWARD) {
        // copy cursor's current position as selectEnd - going backward & using down arrow key => reduce area
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      } else {
        // select area not used yet - using down arrow:
        // - start = original cursor position
        // - end = current cursor position
        this.cursor.selectStart = {
          xLine: originalXLine, // use original without alteration!
          yLine: originalAbsYline,
        };
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      }
    } else {
      this.cursor.selectStart = undefined;
      this.cursor.selectEnd = undefined;
    }

    this.cursor.setTrueSelectionDirection();
  }

  onArrowLeft({
    ctrlKey,
    shiftKey,
  }: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
  }) {
    // default delta to the left
    let offsetLeft = -1;

    const originalXLine = this.cursor.xLine;

    if (ctrlKey) {
      // ctrl key used - find last word to the left
      offsetLeft = 0;
      while (!offsetLeft) {
        [offsetLeft] = this.text.getCursorWordOffsets(
          this.viewport,
          this.cursor
        );

        if (offsetLeft === -0) {
          this.cursor.move(-1, 0);
          if (this.cursor.xLine <= 0) {
            this.cursor.yLine = Math.max(0, this.cursor.yLine - 1);
            this.cursor.xLine =
              Math.floor(this.annotator.width / this.annotator.charWidth) - 1;
          }
        }
      }
    }

    // go 1 line up if at the start
    if (this.cursor.xLine <= 0) {
      // only if there is a way to go up
      if (this.cursor.yLine > 0) {
        this.cursor.yLine = Math.max(0, this.cursor.yLine - 1);
        const line = this.text.getCurrentLine(this.viewport, this.cursor);
        this.cursor.xLine = line?.length || 0;
      }
    } else {
      this.cursor.move(offsetLeft, 0);
    }

    if (shiftKey) {
      if (this.cursor.selectDirection === DIRECTION.FORWARD) {
        // copy cursor's current position as selectEnd - going forward & using left arrow key => reduce area
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      } else if (this.cursor.selectDirection === DIRECTION.BACKWARD) {
        // copy cursor's current position as selectEnd - going backward & using left arrow key => increase area
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      } else {
        // select area not used yet - using left arrow:
        // - start = original cursor position
        // - end = current cursor position
        this.cursor.selectStart = {
          xLine: originalXLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      }
    } else {
      if (this.cursor.isSelected()) {
        // if something is selected -> move the cursor to leftmost position and cancel the selection
        this.cursor.xLine = this.cursor.selectStart?.xLine || this.cursor.xLine;
        this.cursor.yLine = this.cursor.selectStart
          ? this.cursor.selectStart.yLine - this.viewport.lineStart
          : this.cursor.yLine;
        offsetLeft = 0;
      }

      this.cursor.selectStart = undefined;
      this.cursor.selectEnd = undefined;
    }

    this.cursor.setTrueSelectionDirection();
  }

  onArrowRight({
    ctrlKey,
    shiftKey,
  }: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
  }) {
    // default delta to the right
    let offsetRight = 1;

    const originalXLine = this.cursor.xLine;

    if (ctrlKey) {
      // ctrl key used - find next word to the right
      offsetRight = 0;
      while (!offsetRight) {
        [, offsetRight] = this.text.getCursorWordOffsets(
          this.viewport,
          this.cursor
        );
        if (!offsetRight) {
          this.cursor.move(1, 0);
          if (
            this.cursor.xLine >
            Math.floor(this.annotator.width / this.annotator.charWidth)
          ) {
            this.cursor.xLine = 0;
            this.cursor.yLine++;
          }
        } else if (
          offsetRight + this.cursor.xLine >
          Math.floor(this.annotator.width / this.annotator.charWidth)
        ) {
          this.cursor.xLine = 0;
          this.cursor.yLine++;
        }

        if (this.cursor.yLine > this.viewport.noLines) {
          this.cursor.yLine = this.viewport.noLines - 1;
          break;
        }
      }
    }

    this.cursor.move(offsetRight, 0);

    // check if we are at the end of the line -> move to next line
    const line = this.text.getCurrentLine(this.viewport, this.cursor) || "";
    let backupXLine = this.cursor.xLine;
    let backupYLine = this.cursor.yLine;

    if (line.length < this.cursor.xLine) {
      this.cursor.xLine = 0;
      this.cursor.yLine++;
    }

    // revert if end of the document reached
    if (!this.text.cursorToIndex(this.viewport, this.cursor)) {
      this.cursor.xLine = backupXLine - 1;
      this.cursor.yLine = backupYLine;
    }

    if (shiftKey) {
      if (this.cursor.selectDirection === DIRECTION.FORWARD) {
        // copy cursor's current position as selectEnd - going forward & using right arrow key => increase area
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      } else if (this.cursor.selectDirection === DIRECTION.BACKWARD) {
        // copy cursor's current position as selectEnd - going backward & using right arrow key => reduce area
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      } else {
        // select area not used yet - using right arrow:
        // - start = original cursor position
        // - end = current cursor position
        this.cursor.selectStart = {
          xLine: originalXLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
        this.cursor.selectEnd = {
          xLine: this.cursor.xLine,
          yLine: this.viewport.lineStart + this.cursor.yLine,
        };
      }
    } else {
      if (this.cursor.isSelected()) {
        // if something is selected -> move the cursor to rightmost position and cancel the selection
        this.cursor.xLine = this.cursor.selectEnd?.xLine || this.cursor.xLine;
        this.cursor.yLine = this.cursor.selectEnd
          ? this.cursor.selectEnd.yLine - this.viewport.lineStart
          : this.cursor.yLine;
        offsetRight = 0;
      }

      this.cursor.selectStart = undefined;
      this.cursor.selectEnd = undefined;
    }

    this.cursor.setTrueSelectionDirection();
  }
  /**
   * onKeyDown is handler for pressed key event
   * @param e
   */
  onKeyDown(e: KeyboardEvent) {
    e.preventDefault();
    let key: Key = e.key as Key;

    switch (e.key) {
      case Key.Enter:
        this.onKeyEnter();
        break;

      case Key.ArrowUp:
        this.onArrowUp(e);
        break;

      case Key.ArrowDown:
        this.onArrowDown(e);
        break;

      case Key.ArrowLeft:
        this.onArrowLeft(e);
        break;

      case Key.ArrowRight:
        this.onArrowRight(e);
        break;

      case Key.Backspace:
        this.onKeyBackspace(e);
        break;

      case Key.Delete:
        this.onKeyDelete(e);
        break;

      case Key.PageUp:
        this.onKeyPgUp(e);
        break;

      case Key.PageDown:
        this.onKeyPgDown(e);
        break;

      case Key.End:
        this.onKeyEnd(e);
        break;

      case Key.Home:
        this.onKeyHome(e);
        break;

      default:
        if (e.ctrlKey || e.metaKey) {
          if (e.key === "c") {
            this.annotator.onCopyText();
          } else if (e.key === "v") {
            this.annotator.onPasteText();
          } else if (e.key === "x") {
            if (this.text.mode === EditMode.RAW) {
              this.annotator.onCopyText();
              const area = this.cursor.getSelectedArea();
              if (area) {
                this.text.deleteRangeText(area[0], area[1]);
                this.cursor.reset();
                this.cursor.setPosition(
                  area[0].xLine,
                  area[0].yLine - this.viewport.lineStart
                );
              }
            } else if (this.text.mode === EditMode.SEMI) {
              // ctrl + x in semi mode - copy text and delete it
              this.annotator.onCopyText();
              this.onKeyDelete(e);
            }
          } else if (e.key === "a") {
            this.cursor.selectStart = {
              yLine: 0,
              xLine: 0,
            };

            const lastSegment =
              this.text.segments[this.text.segments.length - 1];
            this.cursor.selectEnd = {
              xLine: lastSegment.lines[lastSegment.lines.length - 1].length,
              yLine: lastSegment.lineEnd,
            };
          }
          break;
        }

        if (!Keys.nonCharKeys.includes(key)) {
          if (this.text.mode === EditMode.HIGHLIGHT) {
            return;
          }

          this.text.insertText(this.viewport, this.cursor, key);
          if (this.annotator.onTextChangeCb) {
            this.annotator.onTextChangeCb(this.text.value);
          }
          this.cursor.move(+1, 0);
        }
    }

    if (
      this.text.mode !== EditMode.HIGHLIGHT &&
      this.annotator.onTextChangeCb
    ) {
      this.annotator.onTextChangeCb(this.text.value);
    }
    this.annotator.draw();
  }
}
