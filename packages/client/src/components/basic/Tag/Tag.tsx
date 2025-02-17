import { EntityEnums } from "@shared/enums";
import { IEntity } from "@shared/types";
import { useSearchParams } from "hooks";
import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FaStar } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import theme from "Theme/theme";
import { DraggedEntityReduxItem, EntityColors, EntityDragItem } from "types";
import { getShortLabelByLetterCount } from "utils/utils";
import {
  StyledButtonWrapper,
  StyledElvlWrapper,
  StyledEntityTag,
  StyledLabel,
  StyledLabelWrap,
  StyledStarWrap,
  StyledTagWrapper,
} from "./TagStyles";
import useDragDrop from "./useDragDrop";

interface TagProps {
  propId: string;
  parentId?: string;
  label?: string;
  labelItalic?: boolean;

  entityClass?: EntityEnums.ExtendedClass;
  status?: string;
  ltype?: string;
  entity?: IEntity;

  borderStyle?: "solid" | "dashed" | "dotted";
  button?: ReactNode;
  elvlButtonGroup?: ReactNode | false;
  invertedLabel?: boolean;
  showOnly?: "entity" | "label";
  fullWidth?: boolean;
  index?: number;
  moveFn?: (dragIndex: number, hoverIndex: number) => void;
  disableCopyLabel?: boolean;
  disableDoubleClick?: boolean;
  disableDrag?: boolean;
  updateOrderFn?: (item: EntityDragItem) => void;
  lvl?: number;
  isFavorited?: boolean;
  isTemplate?: boolean;
  isDiscouraged?: boolean;
  disabled?: boolean;

  onButtonOver?: () => void;
  onButtonOut?: () => void;
  onBtnClick?: () => void;
}

export const Tag: React.FC<TagProps> = ({
  propId,
  parentId,
  label = "",
  labelItalic = false,
  entityClass = EntityEnums.Extension.NoClass,
  status = "1",
  ltype = "1",
  entity,
  borderStyle = "solid",
  button,
  elvlButtonGroup,
  invertedLabel = false,
  showOnly,
  fullWidth = false,
  index = -1,
  moveFn,
  disableCopyLabel = false,
  disableDoubleClick = false,
  disableDrag = false,
  updateOrderFn = () => {},
  isFavorited = false,
  isTemplate = false,
  isDiscouraged = false,
  lvl,

  onButtonOver,
  onButtonOut,
  onBtnClick,
}) => {
  const { appendDetailId } = useSearchParams();
  const dispatch = useAppDispatch();
  const draggedEntity: DraggedEntityReduxItem = useAppSelector(
    (state) => state.draggedEntity
  );

  const [clickedOnce, setClickedOnce] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [isDragging, canDrag, drag, drop] = useDragDrop({
    entity,
    isTemplate,
    isDiscouraged,
    propId,
    entityClass,
    disableDrag,
    index,
    lvl,
    updateOrderFn,
    draggedEntity,
    dispatch,
    moveFn,
    ref,
  });

  useEffect(() => {
    if (!clickedOnce) return;

    const timeout = setTimeout(() => {
      navigator.clipboard.writeText(label);
      toast.info(
        `label [${getShortLabelByLetterCount(label, 200)}] copied to clipboard`
      );
      setClickedOnce(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [clickedOnce]);

  const renderTag = useMemo(() => {
    const entityTag = (
      <StyledEntityTag
        $color={
          entityClass !== EntityEnums.Extension.Invalid
            ? EntityColors[entityClass].color
            : "white"
        }
        $isTemplate={isTemplate}
        $darkTheme={true}
      >
        {entityClass}
      </StyledEntityTag>
    );

    const elvlWrapper = elvlButtonGroup && (
      <StyledElvlWrapper>{elvlButtonGroup}</StyledElvlWrapper>
    );

    const labelWrap = (
      <StyledLabelWrap $invertedLabel={invertedLabel}>
        {isFavorited && (
          <StyledStarWrap>
            <FaStar
              color={theme.color.warning}
              style={{ marginBottom: "0.1rem" }}
            />
          </StyledStarWrap>
        )}
        <StyledLabel
          $invertedLabel={invertedLabel}
          $status={status}
          $labelOnly={showOnly === "label"}
          $borderStyle={borderStyle}
          $fullWidth={fullWidth}
          $isFavorited={isFavorited}
          $isItalic={labelItalic}
        >
          {label}
        </StyledLabel>
      </StyledLabelWrap>
    );

    const buttonWrap = button && (
      <StyledButtonWrapper
        $status={status}
        onMouseEnter={onButtonOver}
        onMouseLeave={onButtonOut}
        onClick={onBtnClick}
      >
        {button}
      </StyledButtonWrapper>
    );

    return showOnly ? (
      <>
        {showOnly === "entity" ? entityTag : labelWrap}
        {buttonWrap}
      </>
    ) : (
      <>
        {entityTag}
        {labelWrap}
        {elvlWrapper}
        {buttonWrap}
      </>
    );
  }, [
    entityClass,
    isFavorited,
    invertedLabel,
    label,
    labelItalic,
    elvlButtonGroup,
    borderStyle,
    fullWidth,
    showOnly,
    status,
    button,
    isTemplate,
    onButtonOver,
    onButtonOut,
    onBtnClick,
  ]);

  return (
    <StyledTagWrapper
      className="tag"
      ref={ref}
      $dragDisabled={!canDrag}
      $status={status}
      $ltype={ltype}
      $borderStyle={borderStyle}
      onClick={(e) => {
        e.stopPropagation();
        if (!disableCopyLabel) setClickedOnce(true);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setClickedOnce(false);
        !disableDoubleClick && appendDetailId(propId);
      }}
    >
      {renderTag}
    </StyledTagWrapper>
  );
};
