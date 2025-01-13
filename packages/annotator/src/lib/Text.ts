import Viewport from "./Viewport";
import Highlighter, {
  IAbsCoordinates,
  IRelativeCoordinates,
} from "./Highlighter";
import { EditMode } from "./constants";
import Cursor from "./Cursor";

export interface ITag {
  position: number;
  tag: string;
  closing?: boolean;
}

export class Segment {
  lineStart: number = -1; // incl.
  lineEnd: number = -1; // incl.
  raw: string;
  parsed: string = "";
  openingTags: ITag[] = [];
  closingTags: ITag[] = [];
  lines: string[] = [];

  constructor(text: string) {
    this.raw = text;
    this.parseText();
  }

  parseText() {
    this.openingTags = [];
    this.closingTags = [];
    const openingTagsRegex = /<([^<>\/]+?)>/g;
    const closingTagsRegex = /<\/([^<>]+?)>/g;

    // Find opening tags
    let match;
    while ((match = openingTagsRegex.exec(this.raw)) !== null) {
      this.openingTags.push({
        position: match.index,
        tag: match[1],
      });
    }

    // Find closing tags
    while ((match = closingTagsRegex.exec(this.raw)) !== null) {
      this.closingTags.push({
        position: match.index,
        tag: match[1],
      });
    }

    // Remove tags from the text
    this.parsed = this.raw.replace(/<\/?[^<>]+?>/g, "");
  }

  getTagsForPosition(pos: SegmentPosition): [ITag[], ITag[]] {
    const openedTags: ITag[] = [];
    const closedTags: ITag[] = [];
    for (const tag of this.openingTags) {
      if (tag.position < pos.rawTextIndex) {
        openedTags.push(tag);
      }
    }
    for (const tag of this.closingTags) {
      if (tag.position < pos.rawTextIndex) {
        closedTags.push(tag);
      }
    }
    return [openedTags, closedTags];
  }

  findTagParsedPosition(tag: ITag): { x: number; y: number } {
    // find abs position right after the <tag> in segment's text
    let parsedTextOpenPosition = this.openingTags
      .filter((t) => t.position < tag.position)
      .reduce((acc, cur) => {
        return acc - cur.tag.length - 2;
      }, tag.position);
    parsedTextOpenPosition = this.closingTags
      .filter((t) => t.position < tag.position)
      .reduce((acc, cur) => {
        return acc - cur.tag.length - 3;
      }, parsedTextOpenPosition);

    // fold text-lines to get line-based positon (2d instead of 1d coordinates)
    let y = this.lineStart;
    let x = parsedTextOpenPosition;
    for (const line of this.lines) {
      if (x - line.length <= 0) {
        break;
      }
      x -= line.length;
      y++;
    }

    return { x, y };
  }
}

export interface SegmentPosition {
  segmentIndex: number;
  lineIndex: number;
  charInLineIndex: number;
  parsedTextIndex: number;
  rawTextIndex: number;
}

/**
 * Text provides more abstract control over the provided raw text
 */
class Text {
  mode: EditMode = EditMode.RAW;
  segments: Segment[];
  dirtySegment?: number;
  value: string;
  charsAtLine: number;

  constructor(value: string, charsAtLine: number) {
    this.value = value;
    this.segments = [];
    this.prepareSegments();
    this.charsAtLine = charsAtLine;
    this.calculateLines();
  }

  get noLines(): number {
    return this.segments.reduce<number>((a, c) => a + c.lines.length, 0);
  }

  get lines(): string[] {
    return this.segments.reduce<string[]>((a, cur) => a.concat(cur.lines), []);
  }

  updateCharsAtLine(charsAtLine: number) {
    this.charsAtLine = charsAtLine;
    this.calculateLines();
  }

  prepareSegments() {
    const segmentsArray = this.value.split("\n");
    const segments: Segment[] = [];

    for (let i = 0; i < segmentsArray.length; i++) {
      const segmentText = segmentsArray[i];
      segments.push(new Segment(segmentText));
    }

    this.segments = segments;
  }

  assignValueFromSegments(): void {
    this.value = this.segments.map((s) => s.raw).join("\n");
    this.calculateLines();
  }

  /**
   * calculateLines processes the raw text by splitting it into lines
   * TODO provide more optimized approach so this method does not have to recalculate everyting after writing single characted
   */
  calculateLines(): void {
    const time1 = performance.now();
    for (
      let segmentIndex = 0;
      segmentIndex < this.segments.length;
      segmentIndex++
    ) {
      const segment = this.segments[segmentIndex];

      /* if (
        this.dirtySegment !== undefined &&
        parseInt(segmentIndex) < this.dirtySegment
      ) {
        currentLineNumber += segment.lines.length;
        continue;
      }
*/
      segment.lineStart =
        segmentIndex === 0 ? 0 : this.segments[segmentIndex - 1].lineEnd;
      segment.lines = [];

      let text = segment.raw;
      if (this.mode === EditMode.HIGHLIGHT || this.mode === EditMode.SEMI) {
        text = segment.parsed;
      }

      const regex: RegExp = /(<[^>]+>)|([\w']+)/g;
      const tokens = text.split(regex).filter((t) => !!t);
      let currentLine: string[] = [];
      let currentLineLength = 0;
      for (let iToken = 0; iToken < tokens.length; iToken++) {
        const token = tokens[iToken];
        const tokenLength = token.length;
        if (currentLineLength + tokenLength > this.charsAtLine) {
          // Join the current line into a string and push it to lines
          segment.lines.push(currentLine.join(""));
          currentLine = [token]; // Start a new line with the current word
          currentLineLength = tokenLength; // Reset the length (+1 for the space)
        } else {
          currentLine.push(token);
          currentLineLength += tokenLength; // +1 for the space
        }

        if (iToken + 1 === tokens.length) {
          // Add the last line if it's not empty
          if (currentLine.length > 0) {
            segment.lines.push(currentLine.join(""));
          }
        }
      }
      segment.lineEnd = segment.lineStart + (segment.lines.length || 1);

      if (!segment.lines.length) {
        segment.lines = [""];
      }
    }

    // Performance check
    // const time2 = performance.now();
    // console.log(`${time2 - time1} ms `);
  }

  /**
   * cursorToIndex calculates index position of the text from cursor position
   * @param viewport
   * @param cursor
   * @returns
   */
  cursorToIndex(
    viewport: Viewport,
    cursor: IRelativeCoordinates
  ): SegmentPosition | null {
    const pos = this.getSegmentPosition(
      cursor.yLine + viewport.lineStart,
      cursor.xLine
    );

    return pos;
  }

  getCurrentLine(
    viewport: Viewport,
    cursor: IRelativeCoordinates
  ): string | null {
    const segment = this.cursorToIndex(viewport, cursor);
    if (!segment) {
      return null;
    }

    return this.segments[segment.segmentIndex].lines[segment.lineIndex];
  }

  getAbsTextIndex(cursor: IRelativeCoordinates, viewport?: Viewport, fixClosingTag?: boolean): number {
    const pos = this.getSegmentPosition(
      cursor.yLine + (viewport?.lineStart || 0),
      cursor.xLine,
      fixClosingTag || undefined, 
    );
    if (!pos) {
      return -1;
    }

    let absIndex = pos.rawTextIndex;
    for (let i = 0; i < pos.segmentIndex; i++) {
      absIndex += this.segments[i].raw.length + 1;
    }

    return absIndex;
  }

  getLineFromPosition(segment: SegmentPosition): string {
    return this.segments[segment.segmentIndex].lines[segment.lineIndex] || "";
  }

  getSegmentPosition(
    absLineIndex: number,
    charInLineIndex: number = 0,
    fixClosingTag?: boolean
  ): SegmentPosition | null {
    // sanitize bounds
    if (absLineIndex < 0) {
      absLineIndex = 0;
    } else if (absLineIndex > this.lines.length) {
      absLineIndex = this.lines.length;
    }

    const segmentIndex = this.segments.findLastIndex(
      (s) => s.lineStart <= absLineIndex && s.lineEnd >= absLineIndex
    );

    if (segmentIndex === -1) {
      return null;
    }

    const segment = this.segments[segmentIndex];
    const lineIndex = absLineIndex - segment.lineStart;
    charInLineIndex = segment.lines[lineIndex]
      ? Math.min(charInLineIndex, segment.lines[lineIndex].length)
      : 0;
    let parsedTextIndex = charInLineIndex;
    for (let i = 0; i < lineIndex; i++) {
      parsedTextIndex += segment.lines[i].length;
    }

    let rawTextIndex =  parsedTextIndex;

    if (this.mode !== EditMode.RAW) {
      const tags = segment.openingTags
        .concat(segment.closingTags.map((t) => ({ ...t, closing: true })))
        .sort((a, b) => a.position - b.position);
      for (const tag of tags) {
        if (tag.closing && fixClosingTag ? tag.position < rawTextIndex : tag.position <= rawTextIndex) {
          rawTextIndex += tag.tag.length + (tag.closing ? 3 : 2);
        }
      }
    }

    return {
      segmentIndex,
      lineIndex,
      charInLineIndex,
      parsedTextIndex,
      rawTextIndex,
    };
  }

  getLastSegmentPosition(): SegmentPosition | null {
    if (this.segments.length === 0) {
      return null;
    }

    const lastSegment = this.segments[this.segments.length - 1];
    return {
      segmentIndex: this.segments.length - 1,
      lineIndex: lastSegment.lines.length - 1,
      charInLineIndex: 0,
      parsedTextIndex: 0,
      rawTextIndex: 0,
    };
  }

  /**
   * getViewportText returns visible text to be rendered by Viewport
   * @param viewport
   * @returns
   */
  getViewportText(viewport: Viewport): string[] {
    const posStart = this.getSegmentPosition(viewport.lineStart);
    const posEnd =
      this.getSegmentPosition(viewport.lineEnd) ||
      this.getLastSegmentPosition();

    if (!posStart || !posEnd) {
      return [];
    }

    const out: string[] = [];
    for (let i = posStart.segmentIndex; i <= posEnd.segmentIndex; i++) {
      if (this.segments[i].lines.length) {
        if (i === posStart.segmentIndex) {
          out.push(...this.segments[i].lines.slice(posStart.lineIndex));
        } else if (i === posEnd.segmentIndex) {
          out.push(...this.segments[i].lines.slice(0, posEnd.lineIndex + 1));
        } else if (this.segments[i].lines.length > 0) {
          out.push(...this.segments[i].lines);
        } else {
          console.warn("Should not happen");
        }
      }
    }
    return out;
  }

  findWordOffsets(text: string, index: number): [number, number] {
    const wordRegex = /[^\s,.]+/g; // Match any sequence of characters that are not whitespace, comma, or dot
    let match;

    // Find all matches of words in the text
    const matches = [];
    while ((match = wordRegex.exec(text)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length });
    }

    // Find the word containing the given index
    let wordIndices;
    for (let i = 0; i < matches.length; i++) {
      const { start, end } = matches[i];
      if (index >= start && index < end) {
        wordIndices = { start, end };
        break;
      }
    }

    // If no word contains the given index, return default offsets
    if (!wordIndices) {
      return [0, 0];
    }

    // Calculate offsets relative to the word's start and end indices
    const startOffset = index - wordIndices.start;
    const endOffset = wordIndices.end - index;

    return [-startOffset, endOffset];
  }

  /**
   * getCursorWord returns current word under active cursor
   * @param cursor
   * @returns
   */
  getCursorWordOffsets(
    viewport: Viewport,
    cursor: IRelativeCoordinates
  ): [number, number] {
    const position = this.cursorToIndex(viewport, cursor);
    if (!position) {
      return [0, 0];
    }

    let text = this.segments[position.segmentIndex].parsed;
    let textIndex = position.parsedTextIndex;

    if (this.mode === EditMode.RAW) {
      text = this.segments[position.segmentIndex].raw;
      textIndex = position.rawTextIndex;
    }

    return this.findWordOffsets(text, textIndex);
  }

  /**
   * insertText adds text to cursor position
   * @param viewport
   * @param cursorPosition
   * @param textToInsert
   */
  insertText(
    viewport: Viewport,
    cursorPosition: IRelativeCoordinates,
    textToInsert: string
  ): void {
    const segmentPosition = this.cursorToIndex(viewport, cursorPosition);
    if (!segmentPosition) {
      return;
    }

    let indexPosition = segmentPosition.rawTextIndex;
    const segment = this.segments[segmentPosition.segmentIndex];

    if (this.mode !== EditMode.RAW) {
      for (const tag of segment.closingTags) {
        if (tag.position < segmentPosition.rawTextIndex) {
          indexPosition -= tag.tag.length + 3;
        }
      }
    }

    for (let i = 0; i < segmentPosition.segmentIndex; i++) {
      indexPosition++; // each segment should receive +1 character no matter what (newline)
      indexPosition += this.segments[i].raw.length;
    }

    this.value =
      this.value.slice(0, indexPosition) +
      textToInsert +
      this.value.slice(indexPosition);

    segment.raw =
      segment.raw.slice(0, segmentPosition.rawTextIndex) +
      textToInsert +
      segment.raw.slice(segmentPosition.rawTextIndex);

    segment.parseText();
    this.calculateLines();
  }

  /**
   * adds newline character on current cursor position, creating new segment in the process
   * @param viewport
   * @param cursorPosition
   * @returns
   */
  insertNewline(
    viewport: Viewport,
    cursorPosition: IRelativeCoordinates
  ): void {
    const segmentPosition = this.cursorToIndex(viewport, cursorPosition);
    if (!segmentPosition) {
      return;
    }

    let indexPosition = segmentPosition.rawTextIndex;
    for (let i = 0; i < segmentPosition.segmentIndex; i++) {
      indexPosition++; // each segment should receive +1 character no matter what (newline)
      indexPosition += this.segments[i].raw.length;
    }

    this.value =
      this.value.slice(0, indexPosition) +
      "\n" +
      this.value.slice(indexPosition);

    this.prepareSegments();
    this.calculateLines();
  }

  deleteSegment(index: number) {
    this.segments = this.segments
      .slice(0, index)
      .concat(this.segments.slice(index + 1));
  }

  /**
   * deleteText removes one char from text at cursor's position
   * For more characters, see deleteRangeText as that method is slighly slower that this
   * @param viewport
   * @param cursorPosition
   * @param forwardChar
   */
  deleteTextChar(
    viewport: Viewport,
    cursorPosition: IRelativeCoordinates,
    forwardChar?: boolean
  ): void {
    const segmentPos = this.cursorToIndex(viewport, cursorPosition);
    if (!segmentPos) {
      return;
    }

    this.dirtySegment = segmentPos.segmentIndex;

    let indexPos = segmentPos.rawTextIndex;
    for (let i = 0; i < segmentPos.segmentIndex; i++) {
      indexPos++; // each segment should receive +1 character no matter what (newline)
      indexPos += this.segments[i].raw.length;
    }

    this.value = this.value.slice(0, indexPos - 1) + this.value.slice(indexPos);

    const segment = this.segments[segmentPos.segmentIndex];

    if (!segment.raw) {
      this.prepareSegments();
    } else if (segmentPos.rawTextIndex) {
      const xAlterPos = segmentPos.rawTextIndex - (forwardChar ? 0 : 1);
      segment.raw =
        segment.raw.slice(0, xAlterPos) + segment.raw.slice(xAlterPos + 1);
      segment.parseText();
    } else {
      this.prepareSegments();
    }

    this.calculateLines();
  }

  /**
   * getRangeText returns text delimited by provided absolute range
   * @param start
   * @param end
   * @returns
   */
  getRangeText(start: IAbsCoordinates, end: IAbsCoordinates): string {
    // swap in case start is after end
    if (
      start.yLine > end.yLine ||
      (start.yLine === end.yLine && start.xLine > end.xLine)
    ) {
      const tempStart = start;
      start = end;
      end = tempStart;
    }

    const rangeLines = this.lines.slice(start.yLine, end.yLine + 1);
    const linesSize = rangeLines.length;
    if (!linesSize) {
      return "";
    }

    rangeLines[linesSize - 1] = rangeLines[linesSize - 1].slice(0, end.xLine);
    rangeLines[0] = rangeLines[0].slice(start.xLine, rangeLines[0].length + 1);
    return rangeLines.join("\n");
  }

  deleteRangeText(start: IAbsCoordinates, end: IAbsCoordinates): void {
    // swap in case start is after end
    if (
      start.yLine > end.yLine ||
      (start.yLine === end.yLine && start.xLine > end.xLine)
    ) {
      const tempStart = start;
      start = end;
      end = tempStart;
    }

    const startI = this.getAbsTextIndex(start);
    const endI = this.getAbsTextIndex(end);
    this.value = this.value.substring(0, startI) + this.value.substring(endI);

    this.prepareSegments();
    this.calculateLines();
  }

  getTagPosition(tag: string, occurrence: number = 1): IAbsCoordinates[] {
    let openingTagMatch: { tag: ITag; segment: Segment } | null = null;
    let closingTagMatch: { tag: ITag; segment: Segment } | null = null;

    let openingTagCount = 0;
    let closingTagCount = 0;

    // Search for the opening tag
    for (const segment of this.segments) {
      for (const openingTag of segment.openingTags) {
        if (openingTag.tag === tag) {
          openingTagCount++;
          if (openingTagCount === occurrence) {
            openingTagMatch = { tag: openingTag, segment };
            break;
          }
        }
      }
      if (openingTagMatch) break;
    }

    // Search for the closing tag
    for (const segment of this.segments) {
      for (const closingTag of segment.closingTags) {
        if (closingTag.tag === tag) {
          closingTagCount++;
          if (closingTagCount === occurrence) {
            closingTagMatch = { tag: closingTag, segment };
            break;
          }
        }
      }
      if (closingTagMatch) break;
    }

    // Check if both tags were found
    if (!openingTagMatch || !closingTagMatch) {
      // console.warn(`Tag "${tag}" with occurrence ${occurrence} not found.`);
      return [];
    }

    // Calculate the parsed positions of the opening and closing tags
    const start = openingTagMatch.segment.findTagParsedPosition(
      openingTagMatch.tag
    );
    const end = closingTagMatch.segment.findTagParsedPosition(
      closingTagMatch.tag
    );

    // Return the coordinates
    return [
      { xLine: start.x, yLine: start.y },
      { xLine: end.x, yLine: end.y },
    ];
  }
}

export default Text;
