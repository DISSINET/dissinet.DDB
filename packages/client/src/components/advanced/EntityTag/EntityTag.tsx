import { Placement } from "@popperjs/core";
import { EntityEnums } from "@shared/enums";
import { IEntity } from "@shared/types";
import { ThemeColor } from "Theme/theme";
import { Button, Tag } from "components";
import { EntityTooltip } from "components/advanced";
import React, { ReactNode, useCallback, useRef, useState } from "react";
import { FaUnlink } from "react-icons/fa";
import { useAppSelector } from "redux/hooks";
import { DraggedEntityReduxItem, EntityDragItem } from "types";
import {
  getEntityLabel,
  isFirstLabelEmpty,
  isValidEntityClass,
} from "utils/utils";
import { StyledEntityTagWrap } from "./EntityTagStyles";

interface UnlinkButton {
  onClick: () => void;
  color?: keyof ThemeColor;
  tooltipLabel?: string;
  icon?: JSX.Element;
}
interface EntityTag {
  entity: IEntity;
  parentId?: string;
  showOnly?: "entity" | "label";
  fullWidth?: boolean;
  button?: ReactNode;
  index?: number;
  moveFn?: (dragIndex: number, hoverIndex: number) => void;
  isSelected?: boolean;
  disableTooltip?: boolean;
  disableDoubleClick?: boolean;
  disableDrag?: boolean;
  tooltipPosition?: Placement;
  updateOrderFn?: (item: EntityDragItem) => void;
  lvl?: number;
  statementsCount?: number;
  isFavorited?: boolean;
  elvlButtonGroup?: ReactNode | false;
  flexListMargin?: boolean;

  unlinkButton?: UnlinkButton | false;
  customTooltipAttributes?: { partLabel?: string };
}

export const EntityTag: React.FC<EntityTag> = ({
  entity,
  parentId,
  showOnly,
  fullWidth = false,
  button = false,
  index,
  moveFn,
  isSelected,
  disableTooltip = false,
  disableDrag = false,
  disableDoubleClick = false,
  tooltipPosition,
  updateOrderFn,
  lvl,
  statementsCount,
  isFavorited,

  elvlButtonGroup = false,
  flexListMargin = false,

  unlinkButton,
  customTooltipAttributes,
}) => {
  const draggedEntity: DraggedEntityReduxItem = useAppSelector(
    (state) => state.draggedEntity
  );
  if (entity === undefined) {
    return null;
  }

  if (!entity) {
    return null;
  }

  const classId = entity.class;

  const [buttonHovered, setButtonHovered] = useState(false);
  const [elvlHovered, setElvlHovered] = useState(false);
  const [tagHovered, setTagHovered] = useState(false);

  const referenceEl = useRef<HTMLDivElement | null>(null);

  const renderUnlinkButton = (unlinkButton: UnlinkButton) => {
    return (
      <Button
        key="d"
        tooltipLabel={
          unlinkButton.tooltipLabel
            ? unlinkButton.tooltipLabel
            : "unlink entity"
        }
        icon={unlinkButton.icon ? unlinkButton.icon : <FaUnlink />}
        color={unlinkButton.color ? unlinkButton.color : "plain"}
        inverted
        onClick={unlinkButton.onClick}
      />
    );
  };

  if (!isValidEntityClass(entity.class)) {
    // labels needs to have length and first label needs to be non-empty
    return (
      <Tag
        propId={entity.id}
        entityClass={EntityEnums.Extension.Invalid}
        label={getEntityLabel(entity)}
        labelItalic={isFirstLabelEmpty(entity.labels)}
        // button={unlinkButton && renderUnlinkButton(unlinkButton)}
        disableDrag
        disableDoubleClick
      />
    );
  }

  const handleTagHovered = useCallback(() => {
    setTagHovered(true);
  }, []);

  const handleTagUnhovered = useCallback(() => {
    setTagHovered(false);
  }, []);
  const handleButtonHovered = useCallback(() => {
    setButtonHovered(true);
  }, []);

  const handleButtonUnhovered = useCallback(() => {
    setButtonHovered(false);
  }, []);

  const handleBtnClick = useCallback(() => {
    setButtonHovered(false);
    setTagHovered(false);
  }, []);

  return (
    <>
      <StyledEntityTagWrap
        $flexListMargin={flexListMargin}
        ref={referenceEl}
        onMouseEnter={handleTagHovered}
        onMouseLeave={handleTagUnhovered}
      >
        {tagHovered && !disableTooltip && (
          <EntityTooltip
            entityId={entity.id}
            entityClass={entity.class}
            label={(entity.labels && entity.labels[0]) || <i>{"no label"}</i>}
            alternativeLabels={
              entity.labels && entity.labels.length > 1
                ? entity.labels.slice(1)
                : undefined
            }
            language={entity.language}
            detail={entity.detail}
            text={
              entity.class === EntityEnums.Class.Statement
                ? entity.data.text
                : undefined
            }
            isTemplate={entity.isTemplate}
            partOfSpeech={entity.data.pos}
            itemsCount={statementsCount}
            position={tooltipPosition}
            disabled={
              (button !== null && (buttonHovered || elvlHovered)) ||
              Object.keys(draggedEntity).length !== 0
            }
            tagHovered={tagHovered}
            referenceElement={referenceEl.current}
            customTooltipAttributes={customTooltipAttributes}
          />
        )}
        <Tag
          propId={entity.id}
          label={getEntityLabel(entity)}
          labelItalic={isFirstLabelEmpty(entity.labels)}
          status={entity.status}
          ltype={entity?.data?.logicalType ?? "1"}
          isTemplate={entity.isTemplate}
          isDiscouraged={entity.status === EntityEnums.Status.Discouraged}
          entity={entity}
          showOnly={showOnly}
          button={
            button ? button : unlinkButton && renderUnlinkButton(unlinkButton)
          }
          moveFn={moveFn}
          entityClass={classId}
          borderStyle="solid"
          invertedLabel={isSelected}
          index={index}
          disableDoubleClick={disableDoubleClick}
          disableDrag={disableDrag}
          updateOrderFn={updateOrderFn}
          parentId={parentId}
          lvl={lvl}
          fullWidth={fullWidth}
          isFavorited={isFavorited}
          onButtonOver={handleButtonHovered}
          onButtonOut={handleButtonUnhovered}
          onBtnClick={handleBtnClick}
          elvlButtonGroup={
            elvlButtonGroup ? (
              <div
                onMouseOver={() => setElvlHovered(true)}
                onMouseOut={() => setElvlHovered(false)}
              >
                {elvlButtonGroup}
              </div>
            ) : (
              false
            )
          }
        />
      </StyledEntityTagWrap>
    </>
  );
};
