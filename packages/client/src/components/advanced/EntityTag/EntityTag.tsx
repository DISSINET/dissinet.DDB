import { EntityEnums } from "@shared/enums";
import { IEntity } from "@shared/types";
import api from "api";
import { Tag } from "components";
import React, { ReactNode } from "react";
import { useQuery } from "react-query";
import { PopupPosition } from "reactjs-popup/dist/types";
import { DragItem } from "types";
import { getEntityLabel } from "utils";

interface EntityTag {
  entity: IEntity;
  tooltipText?: string;
  parentId?: string;
  mode?: "selected" | "disabled" | "invalid" | false;
  showOnly?: "entity" | "label";
  fullWidth?: boolean;
  button?: ReactNode;
  index?: number;
  moveFn?: (dragIndex: number, hoverIndex: number) => void;
  isSelected?: boolean;
  disableTooltip?: boolean;
  disableDoubleClick?: boolean;
  disableDrag?: boolean;
  tooltipPosition?: PopupPosition | PopupPosition[];
  updateOrderFn?: (item: DragItem) => void;
  lvl?: number;
  statementsCount?: number;
  isFavorited?: boolean;
}

export const EntityTag: React.FC<EntityTag> = ({
  entity,
  tooltipText,
  parentId,
  showOnly,
  fullWidth,
  mode,
  button,
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
}) => {
  const classId = entity.class;

  // for testing
  if (entity.id === "c211" || entity.id === "l1200") {
    const { data: tooltipData } = useQuery(
      ["tooltip", entity.id],
      async () => {
        const res = await api.tooltipGet(entity.id);
        return res.data;
      },
      {
        enabled: api.isLoggedIn(),
      }
    );

    if (tooltipData) {
      console.log(tooltipData);
      console.log(tooltipData.superclassTrees);
    }
  }

  return (
    <Tag
      propId={entity.id}
      label={getEntityLabel(entity)}
      labelItalic={entity.label === ""}
      status={entity.status}
      ltype={entity?.data?.logicalType ?? "1"}
      tooltipDetail={entity.detail}
      isTemplate={entity.isTemplate}
      isDiscouraged={entity.status === EntityEnums.Status.Discouraged}
      entity={entity}
      tooltipText={tooltipText}
      showOnly={showOnly}
      button={button}
      moveFn={moveFn}
      entityClass={classId}
      mode={mode}
      borderStyle="solid"
      invertedLabel={isSelected}
      index={index}
      disableTooltip={disableTooltip}
      disableDoubleClick={disableDoubleClick}
      disableDrag={disableDrag}
      tooltipPosition={tooltipPosition}
      updateOrderFn={updateOrderFn}
      parentId={parentId}
      lvl={lvl}
      fullWidth={fullWidth}
      isFavorited={isFavorited}
      statementsCount={statementsCount}
    />
  );
};
