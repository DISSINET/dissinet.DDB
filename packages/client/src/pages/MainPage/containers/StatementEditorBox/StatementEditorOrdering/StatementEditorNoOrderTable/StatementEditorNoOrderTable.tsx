import { StatementEnums } from "@shared/enums";
import { IEntity, IResponseGeneric, OrderType, PropOrder } from "@shared/types";
import { AxiosResponse } from "axios";
import { Button, Table } from "components";
import { EmptyTag, EntityTag } from "components/advanced";
import React, { useMemo } from "react";
import { CgPlayListAdd } from "react-icons/cg";
import { UseMutationResult } from "react-query";
import { Cell, Column } from "react-table";

interface StatementEditorNoOrderTable {
  elements: OrderType[];
  entities: { [key: string]: IEntity };
  addToOrdering: (elementId: string) => void;
}
export const StatementEditorNoOrderTable: React.FC<
  StatementEditorNoOrderTable
> = ({ elements, entities, addToOrdering }) => {
  const data = useMemo(() => elements, [elements]);
  const columns: Column<{}>[] = React.useMemo(
    () => [
      {
        id: "button",
        accesor: "data",
        Cell: ({ row }: Cell) => {
          const orderObject = row.original as OrderType;
          console.log(orderObject.type);
          const { elementId } = row.original as any;

          return (
            <CgPlayListAdd
              size={20}
              style={{ cursor: "pointer" }}
              onClick={() => addToOrdering(elementId)}
            />
          );
        },
      },
      {
        id: "tags",
        accessor: "data",
        Cell: ({ row }: Cell) => {
          const orderObject = row.original as OrderType;
          if (orderObject.type === StatementEnums.ElementType.Prop) {
            const { propValueId, propTypeId, originId } =
              orderObject as PropOrder;
            const propTypeEntity = entities[propTypeId];
            const propValueEntity = entities[propValueId];
            const originEntity = entities[originId];

            return (
              <>
                {propTypeEntity ? (
                  <EntityTag
                    key={propTypeEntity.id}
                    entity={propTypeEntity}
                    tooltipText={propTypeEntity.label}
                  />
                ) : (
                  <EmptyTag label="type" />
                )}
                {propValueEntity ? (
                  <EntityTag
                    key={propValueEntity.id}
                    entity={propValueEntity}
                    tooltipText={propValueEntity.label}
                  />
                ) : (
                  <EmptyTag label="value" />
                )}
              </>
            );
          } else {
            const { entityId } = row.original as any;
            const entity = entities[entityId];
            return (
              <>
                {entity && (
                  <EntityTag
                    key={entity.id}
                    entity={entity}
                    tooltipText={entity.label}
                  />
                )}
              </>
            );
          }
        },
      },
      {
        id: "info",
        Cell: ({ row }: Cell) => {
          const orderObject = row.original as OrderType;
          return (
            <div style={{ backgroundColor: "pink", textAlign: "right" }}>
              {orderObject.type}
            </div>
          );
        },
      },
    ],
    [elements, entities]
  );

  return (
    <Table
      data={data}
      columns={columns}
      perPage={1000}
      disableHeading
      disableHeader
      firstColumnMinWidth
    />
  );
};
