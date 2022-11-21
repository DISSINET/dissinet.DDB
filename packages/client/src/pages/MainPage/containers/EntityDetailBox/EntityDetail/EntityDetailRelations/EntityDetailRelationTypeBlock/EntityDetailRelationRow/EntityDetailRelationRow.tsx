import { certaintyDict } from "@shared/dictionaries";
import { RelationEnums } from "@shared/enums";
import { IResponseEntity, IResponseGeneric, Relation } from "@shared/types";
import { AxiosResponse } from "axios";
import { Button, Dropdown } from "components";
import { EntityTag } from "components/advanced";
import React, { useRef } from "react";
import {
  DragSourceMonitor,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from "react-dnd";
import { FaGripVertical, FaUnlink } from "react-icons/fa";
import { UseMutationResult } from "react-query";
import { DragItem, ItemTypes } from "types";
import { dndHoverFn } from "utils";
import {
  StyledGrid,
  StyledGridColumn,
} from "../EntityDetailRelationTypeBlockStyles";

interface EntityDetailRelationRow {
  relation: Relation.IRelation;
  entityId: string;
  relationRule: Relation.RelationRule;
  relationType: RelationEnums.Type;
  entities?: IResponseEntity[];
  relationUpdateMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    {
      relationId: string;
      changes: any;
    },
    unknown
  >;
  relationDeleteMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    string,
    unknown
  >;

  isMultiple: boolean;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  index: number;
}
export const EntityDetailRelationRow: React.FC<EntityDetailRelationRow> = ({
  relation,
  relationRule,
  entityId,
  relationType,
  entities,
  relationUpdateMutation,
  relationDeleteMutation,

  isMultiple,
  moveRow,
  index,
}) => {
  const dropRef = useRef<HTMLTableRowElement>(null);
  const dragRef = useRef<HTMLTableCellElement>(null);

  const handleMultiRemove = (relationId: string) => {
    relationDeleteMutation.mutate(relationId);
  };

  const shouldBeRendered = (key: number) =>
    !relationRule.asymmetrical || (relationRule.asymmetrical && key > 0);

  const renderCertainty = (relation: Relation.IRelation) => (
    <div>
      <Dropdown
        width={140}
        placeholder="certainty"
        options={certaintyDict}
        value={{
          value: (relation as Relation.IIdentification).certainty,
          label: certaintyDict.find(
            (c) => c.value === (relation as Relation.IIdentification).certainty
          )?.label,
        }}
        onChange={(newValue: any) => {
          relationUpdateMutation.mutate({
            relationId: relation.id,
            changes: { certainty: newValue.value as string },
          });
        }}
      />
    </div>
  );

  const [, drop] = useDrop({
    accept: ItemTypes.ACTION_ROW,
    hover(item: DragItem, monitor: DropTargetMonitor) {
      dndHoverFn(item, index, monitor, dropRef, moveRow);
    },
  });

  // const moveEndRow = async (statementToMove: IStatement, index: number) => {
  //   if (statementToMove.data.territory && statements[index].data.territory) {
  //     const { order: thisOrder, territoryId } = statementToMove.data.territory;

  //     if (thisOrder !== statements[index].data.territory?.order) {
  //       let allOrders: number[] = statements.map((s) =>
  //         s.data.territory ? s.data.territory.order : 0
  //       );
  //       allOrders.sort((a, b) => (a && b ? (a > b ? 1 : -1) : 0));

  //       allOrders = allOrders.filter((o) => o !== thisOrder);
  //       allOrders.splice(index, 0, thisOrder);

  //       if (index === 0) {
  //         allOrders[index] = allOrders[1] - 1;
  //       } else if (index === allOrders.length - 1) {
  //         allOrders[index] = allOrders[index - 1] + 1;
  //       } else {
  //         allOrders[index] = (allOrders[index - 1] + allOrders[index + 1]) / 2;
  //       }

  //       actantsUpdateMutation.mutate({
  //         statementId: statementToMove.id,
  //         data: {
  //           territory: {
  //             territoryId: territoryId,
  //             order: allOrders[index],
  //           },
  //         },
  //       });
  //     }
  //   }
  // };

  const [{ isDragging }, drag, preview] = useDrag({
    item: {
      type: ItemTypes.ACTION_ROW,
      index,
      id: relation.id.toString(),
    },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item: DragItem | undefined, monitor: DragSourceMonitor) => {
      // TODO: calculate order
      if (item && item.index !== index) {
        console.log(item.index);
        relationUpdateMutation.mutate({
          relationId: relation.id,
          changes: { order: item.index + 0.5 },
        });
      }
    },
  });

  const opacity = isDragging ? 0.2 : 1;

  preview(drop(dropRef));
  drag(dragRef);

  return (
    <StyledGrid
      ref={dropRef}
      style={{ opacity }}
      hasAttribute={relationRule.attributes.length > 0}
      isMultiple={isMultiple}
    >
      {relation.entityIds.map((relationEntityId, key) => {
        const relationEntity = entities?.find((e) => e.id === relationEntityId);
        return (
          <React.Fragment key={key}>
            {relationEntity &&
              relationEntity.id !== entityId &&
              shouldBeRendered(key) && (
                <>
                  {isMultiple ? (
                    <StyledGridColumn
                      ref={dragRef}
                      style={{
                        cursor: "move",
                      }}
                    >
                      <FaGripVertical />
                    </StyledGridColumn>
                  ) : (
                    <div />
                  )}
                  <StyledGridColumn key={key}>
                    <EntityTag
                      fullWidth
                      entity={relationEntity}
                      button={
                        <Button
                          key="d"
                          icon={<FaUnlink />}
                          color="plain"
                          inverted
                          tooltip="unlink"
                          onClick={() => handleMultiRemove(relation.id)}
                        />
                      }
                    />
                  </StyledGridColumn>
                </>
              )}
          </React.Fragment>
        );
      })}

      {/* Certainty (Identification) */}
      {relationType === RelationEnums.Type.Identification &&
        renderCertainty(relation)}
    </StyledGrid>
  );
};
