import { useSpring } from "@react-spring/web";
import React, { useEffect, useState } from "react";
import { setPanelWidths } from "redux/features/layout/panelWidthsSlice";
import { setSeparatorXPosition } from "redux/features/layout/separatorXPositionSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import {
  secondPanelMinWidth,
  springConfig,
  thirdPanelMinWidth,
} from "Theme/constants";
import { StyledPanelSeparator } from "./PanelSeparatorStyles";

interface PanelSeparator {}
export const PanelSeparator: React.FC<PanelSeparator> = ({}) => {
  const dispatch = useAppDispatch();
  const panelWidths: number[] = useAppSelector(
    (state) => state.layout.panelWidths
  );
  const layoutWidth: number = useAppSelector(
    (state) => state.layout.layoutWidth
  );
  const separatorXPosition: number = useAppSelector(
    (state) => state.layout.separatorXPosition
  );

  const LEFT_SIDE_MIN_WIDTH = secondPanelMinWidth + panelWidths[0];
  const LEFT_SIDE_MAX_WIDTH = layoutWidth - panelWidths[3] - thirdPanelMinWidth;

  const [separatorXTempPosition, setSeparatorXTempPosition] = useState<
    undefined | number
  >(undefined);
  const [leftWidth, setLeftWidth] = useState<number>(separatorXPosition);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const animatedSeparator = useSpring({
    left: `${(leftWidth - 1) / 10}rem`,
    config: springConfig.separatorXPosition,
  });

  useEffect(() => {
    setLeftWidth(separatorXPosition);

    window.getSelection()?.removeAllRanges();

    const onePercent = layoutWidth / 100;
    const separatorXPercentPosition =
      Math.floor((separatorXPosition / onePercent) * 10) / 10;
    localStorage.setItem(
      "separatorXPosition",
      separatorXPercentPosition.toString()
    );

    dispatch(
      setPanelWidths([
        panelWidths[0],
        separatorXPosition - panelWidths[0],
        layoutWidth - panelWidths[3] - separatorXPosition,
        panelWidths[3],
      ])
    );
  }, [separatorXPosition]);

  useEffect(() => {
    if (!dragging) {
      dispatch(setSeparatorXPosition(leftWidth));
    }
  }, [leftWidth, dragging]);

  const onMouseDown = (e: React.MouseEvent) => {
    setSeparatorXTempPosition(e.clientX);
    setDragging(true);
    document.body.classList.add("no-select");
  };

  const onMove = (clientX: number) => {
    if (dragging && leftWidth && separatorXTempPosition) {
      const newLeftWidth = leftWidth + clientX - separatorXTempPosition;
      setSeparatorXTempPosition(clientX);
      if (newLeftWidth < LEFT_SIDE_MIN_WIDTH) {
        setLeftWidth(LEFT_SIDE_MIN_WIDTH);
        return;
      }

      if (newLeftWidth > LEFT_SIDE_MAX_WIDTH) {
        setLeftWidth(LEFT_SIDE_MAX_WIDTH);
        return;
      }
      setLeftWidth(newLeftWidth);
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    onMove(e.clientX);
  };

  const onMouseUp = () => {
    setDragging(false);
    document.body.classList.remove("no-select");
  };

  useEffect(() => {
    if (hovered || dragging) {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);

      return () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
    }
  }, [hovered, dragging]);

  return (
    <StyledPanelSeparator
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={animatedSeparator}
      $show={hovered || dragging}
    />
  );
};
