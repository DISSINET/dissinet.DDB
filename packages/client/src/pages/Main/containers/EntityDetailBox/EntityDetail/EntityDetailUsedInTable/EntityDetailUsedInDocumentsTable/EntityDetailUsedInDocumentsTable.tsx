import { IDocumentMeta, IEntity } from "@shared/types";
import {
  IResponseDetail,
  IResponseUsedInDocument,
} from "@shared/types/response-detail";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "api";
import { Button, DocumentTitle, Table } from "components";
import { DocumentModalEdit, EntityTag } from "components/advanced";
import React, { useMemo, useState } from "react";
import { FaAnchor, FaTrashAlt } from "react-icons/fa";
import { HiClipboardList } from "react-icons/hi";
import { CellProps, Column } from "react-table";
import { toast } from "react-toastify";
import {
  StyledAbbreviatedLabel,
  StyledAnchorText,
} from "./EntityDetailUsedInDocumentsTableStyles";

type CellType = CellProps<IResponseUsedInDocument>;
interface EntityDetailUsedInDocumentsTable {
  title: { singular: string; plural: string };
  entities: { [key: string]: IEntity };
  uses: IResponseUsedInDocument[];
  perPage?: number;
  entity: IEntity;
}
export const EntityDetailUsedInDocumentsTable: React.FC<
  EntityDetailUsedInDocumentsTable
> = ({ title, entities, uses = [], perPage, entity }) => {
  const data = useMemo(() => uses, [uses]);

  const queryClient = useQueryClient();

  const removeAnchorMutation = useMutation({
    mutationFn: (data: { documentId: string; anchorIndex: number }) =>
      api.documentRemoveAnchor(data.documentId, entity.id, data.anchorIndex),
    onSuccess(data, variables, context) {
      queryClient.invalidateQueries({ queryKey: ["entity"] });
    },
  });

  const [openedDocument, setOpenedDocument] = useState<IDocumentMeta | false>(
    false
  );
  const [tAnchor, setTAnchor] = useState<string | false>(false);
  const [entityOcc, setEntityOcc] = useState<number | false>(false);

  const columns = useMemo<Column<IResponseUsedInDocument>[]>(
    () => [
      {
        Header: "Anchor text",
        Cell: ({ row }: CellType) => {
          const { anchorText } = row.original;
          return (
            <>
              {anchorText ? (
                <StyledAnchorText>
                  <HiClipboardList
                    size={18}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      window.navigator.clipboard.writeText(anchorText);
                      toast.info("text copied to clipboard");
                    }}
                  />
                  <StyledAbbreviatedLabel>
                    {anchorText || ""}
                  </StyledAbbreviatedLabel>
                </StyledAnchorText>
              ) : (
                <></>
              )}
            </>
          );
        },
      },
      {
        Header: "Resource",
        Cell: ({ row }: CellType) => {
          const resourceEntity = entities[row.original.resourceId];
          return <>{resourceEntity && <EntityTag entity={resourceEntity} />}</>;
        },
      },
      {
        Header: "Document",
        Cell: ({ row }: CellType) => {
          const { document } = row.original;
          return document ? <DocumentTitle title={document.title} /> : <></>;
        },
      },
      {
        Header: "Parent territory",
        Cell: ({ row }: CellType) => {
          const territoryEntity = entities[row.original.parentTerritoryId];
          return (
            <>
              {territoryEntity && (
                <EntityTag
                  entity={territoryEntity}
                  unlinkButton={{
                    onClick: () => {
                      setTAnchor(territoryEntity.id);
                      setOpenedDocument(row.original.document);
                    },
                    icon: <FaAnchor />,
                    tooltipLabel: "open anchor",
                  }}
                />
              )}
            </>
          );
        },
      },
      {
        id: "action btns",
        Header: "",
        Cell: ({ row }: CellType) => {
          return (
            <Button
              icon={<FaTrashAlt />}
              color="danger"
              inverted
              onClick={() =>
                removeAnchorMutation.mutate({
                  documentId: row.original.document.id,
                  anchorIndex: row.index,
                })
              }
            />
          );
        },
      },
    ],
    [entities]
  );

  return (
    <>
      <Table
        entityTitle={title}
        columns={columns}
        data={data}
        perPage={perPage}
        isLoading={removeAnchorMutation.isPending}
      />
      {openedDocument && (
        <DocumentModalEdit
          document={openedDocument}
          onClose={() => {
            setOpenedDocument(false);
            setTAnchor(false);
            setEntityOcc(false);
          }}
          anchor={tAnchor ? { entityId: tAnchor } : undefined}
        />
      )}
    </>
  );
};
