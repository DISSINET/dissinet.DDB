import React, { ReactNode, useRef } from "react";
import {
  DragSourceMonitor,
  DropTargetMonitor,
  useDrag,
  useDrop,
  XYCoord,
} from "react-dnd";
const queryString = require("query-string");

import { DragItem, ItemTypes } from "types";
import {
  StyledTagWrapper,
  StyledEntityTag,
  StyledLabel,
  ButtonWrapper,
  StyledTooltipSeparator,
} from "./TagStyles";
import { Tooltip } from "components";
import { useHistory, useLocation } from "react-router-dom";

interface TagProps {
  propId: string;
  label?: string;
  category: string;
  color: string;
  mode?: "selected" | "disabled" | "invalid" | false;
  borderStyle?: "solid" | "dashed" | "dotted";
  button?: ReactNode;
  invertedLabel?: boolean;
  short?: boolean;
  index?: number;
  moveFn?: (dragIndex: number, hoverIndex: number) => void;
  enableTooltip?: boolean;
  position?:
    | "top left"
    | "top center"
    | "top right"
    | "right top"
    | "right center"
    | "right bottom"
    | "bottom left"
    | "bottom center"
    | "bottom right"
    | "left top"
    | "left center"
    | "left bottom"
    | "center center";
  updateOrderFn?: () => void;
}

export const Tag: React.FC<TagProps> = ({
  propId,
  label = "",
  category = "T",
  color,
  mode = false,
  borderStyle = "solid",
  button,
  invertedLabel,
  short = false,
  index,
  moveFn,
  position = "right top",
  enableTooltip = false,
  updateOrderFn = () => {},
}) => {
  let history = useHistory();
  let location = useLocation();
  var hashParams = queryString.parse(location.hash);

  const ref = useRef<HTMLDivElement>(null);
  const hoverFn = (item: DragItem, monitor: DropTargetMonitor) => {
    if (!ref.current) {
      return;
    }
    const dragIndex = item.index;
    const hoverIndex = index;

    if (dragIndex === hoverIndex) {
      return;
    }
    const hoverBoundingRect = ref.current?.getBoundingClientRect();
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
    const clientOffset = monitor.getClientOffset();
    const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;
    if (!hoverIndex) {
      return;
    }
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return;
    }
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return;
    }
    moveFn && moveFn(dragIndex, hoverIndex);
    item.index = hoverIndex;
  };

  const [, drop] = useDrop({
    accept: ItemTypes.TAG,
    hover(item: DragItem, monitor: DropTargetMonitor) {
      hoverFn(item, monitor);
    },
    // drop: updateOrderFn,
  });

  const [{ isDragging }, drag] = useDrag({
    item: { type: ItemTypes.TAG, id: propId, index, category },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
    // end: updateOrderFn,
  });
  drag(drop(ref));

  const renderEntityTag = () => (
    <StyledEntityTag color={color}>{category}</StyledEntityTag>
  );
  const renderButton = () => <ButtonWrapper>{button}</ButtonWrapper>;

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    hashParams["actant"] = propId;
    history.push({
      hash: queryString.stringify(hashParams),
    });
  };

  return (
    <>
      {short ? (
        <Tooltip position={position} label={label}>
          <div>
            <StyledTagWrapper
              ref={ref}
              borderStyle={borderStyle}
              onDoubleClick={(e: React.MouseEvent) => onDoubleClick(e)}
            >
              {renderEntityTag()}
              {button && renderButton()}
            </StyledTagWrapper>
          </div>
        </Tooltip>
      ) : (
        <>
          <Tooltip label={label} disabled={!enableTooltip} position={position}>
            <StyledTooltipSeparator>
              <StyledTagWrapper
                ref={ref}
                borderStyle={borderStyle}
                onDoubleClick={(e: React.MouseEvent) => onDoubleClick(e)}
              >
                {renderEntityTag()}
                {label && (
                  <StyledLabel
                    invertedLabel={invertedLabel}
                    borderStyle={borderStyle}
                  >
                    {label}
                  </StyledLabel>
                )}
                {button && renderButton()}
              </StyledTagWrapper>
            </StyledTooltipSeparator>
          </Tooltip>
        </>
      )}
    </>
  );
};
