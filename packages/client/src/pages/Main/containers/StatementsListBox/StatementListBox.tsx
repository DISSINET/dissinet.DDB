import { EntityEnums, UserEnums } from "@shared/enums";
import {
  IEntity,
  IReference,
  IResponseStatement,
  IStatement,
  ITerritory,
  Relation,
} from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import { CustomScrollbar, Loader, Submit, ToastWithLink } from "components";
import { CStatement, CTerritory } from "constructors";
import { useDebounce, useResizeObserver, useSearchParams } from "hooks";
import React, { useEffect, useMemo, useState } from "react";
import { BsInfoCircle } from "react-icons/bs";
import { toast } from "react-toastify";
import { setStatementListOpened } from "redux/features/layout/statementListOpenedSlice";
import { setShowWarnings } from "redux/features/statementEditor/showWarningsSlice";
import { setDisableStatementListScroll } from "redux/features/statementList/disableStatementListScrollSlice";
import { setRowsExpanded } from "redux/features/statementList/rowsExpandedSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { COLLAPSED_TABLE_WIDTH } from "Theme/constants";
import { EntitiesDeleteSuccessResponse, StatementListDisplayMode } from "types";
import { StatementListHeader } from "./StatementListHeader/StatementListHeader";
import { StatementListTable } from "./StatementListTable/StatementListTable";
import { StatementListTextAnnotator } from "./StatementListTextAnnotator/StatementListTextAnnotator";
import { StyledEmptyState, StyledTableWrapper } from "./StatementLitBoxStyles";
import { RelationPathExist } from "@shared/types/errors";

const initialData: {
  statements: IResponseStatement[];
  entities: { [key: string]: IEntity };
  right: UserEnums.RoleMode;
} = {
  statements: [],
  entities: {},
  right: UserEnums.RoleMode.Read,
};

export const StatementListBox: React.FC = () => {
  const queryClient = useQueryClient();

  const dispatch = useAppDispatch();
  const rowsExpanded: string[] = useAppSelector(
    (state) => state.statementList.rowsExpanded
  );
  const statementListOpened: boolean = useAppSelector(
    (state) => state.layout.statementListOpened
  );
  const isLoading: boolean = useAppSelector(
    (state) => state.statementList.isLoading
  );

  const [hlEntities, setHlEntities] = useState<EntityEnums.Class[]>([
    EntityEnums.Class.Action,
    EntityEnums.Class.Person,
    EntityEnums.Class.Being,
    EntityEnums.Class.Concept,
    EntityEnums.Class.Group,
    EntityEnums.Class.Location,
    EntityEnums.Class.Object,
    EntityEnums.Class.Event,
    EntityEnums.Class.Resource,
    EntityEnums.Class.Person,
    EntityEnums.Class.Statement,
    EntityEnums.Class.Value,
    EntityEnums.Class.Territory,
  ]);

  const {
    territoryId,
    setTerritoryId,
    statementId,
    setStatementId,
    detailIdArray,
    removeDetailId,
    appendDetailId,
    annotatorOpened,
    setAnnotatorOpened,
  } = useSearchParams();

  useEffect(() => {
    dispatch(setDisableStatementListScroll(false));
  }, [statementId, territoryId, statementListOpened]);

  useEffect(() => {
    if (!detailIdArray.length && !statementListOpened) {
      dispatch(setStatementListOpened(true));
    }
  }, [detailIdArray, statementListOpened]);

  const [showSubmit, setShowSubmit] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<IStatement>();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const displayMode: StatementListDisplayMode = useMemo(() => {
    if (annotatorOpened === null) {
      return StatementListDisplayMode.TEXT;
    }
    return annotatorOpened
      ? StatementListDisplayMode.TEXT
      : StatementListDisplayMode.LIST;
  }, [annotatorOpened]);

  const handleDisplayModeChange = (
    newDisplayMode: StatementListDisplayMode
  ) => {
    setAnnotatorOpened(newDisplayMode === StatementListDisplayMode.TEXT);
  };

  const { status, data, error, isFetching } = useQuery({
    queryKey: ["territory", "statement-list", territoryId, statementListOpened],
    queryFn: async () => {
      const res = await api.territoryGet(territoryId);
      return res.data;
    },
    enabled: !!territoryId && api.isLoggedIn() && statementListOpened,
  });

  const { statements, entities, right } = data || initialData;

  useEffect(() => {
    dispatch(setRowsExpanded([]));
  }, [territoryId]);

  // get user
  const userId = localStorage.getItem("userid");
  const {
    status: userStatus,
    data: userData,
    error: userError,
    isFetching: userIsFetching,
  } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      if (userId) {
        const res = await api.usersGet(userId);
        return res.data;
      }
    },
    enabled: api.isLoggedIn() && !!userId,
  });

  const [storedTerritoryIds, setStoredTerritoryIds] = useState<string[]>([]);
  useEffect(() => {
    if (userData?.storedTerritories) {
      setStoredTerritoryIds(
        userData.storedTerritories.map((territory) => territory.territory.id)
      );
    }
  }, [userData?.storedTerritories]);
  const isFavorited = data && storedTerritoryIds?.includes(data.id);

  useEffect(() => {
    if (error && (error as any).error === "TerritoryDoesNotExits") {
      setTerritoryId("");
    }
  }, [error]);

  const deleteStatementMutation = useMutation({
    mutationFn: async (sId: string) =>
      await api.entityDelete(sId, { ignoreErrorToast: true }),
    onSuccess: (data, sId) => {
      toast.info(
        <ToastWithLink
          children={`Statement deleted!`}
          linkText={"Restore"}
          onLinkClick={async () => {
            const response = await api.entityRestore(sId);
            toast.info("Statement restored");
            queryClient.invalidateQueries({
              queryKey: ["detail-tab-entities"],
            });
            queryClient.invalidateQueries({ queryKey: ["tree"] });
            queryClient.invalidateQueries({ queryKey: ["territory"] });
          }}
        />,
        {
          autoClose: 5000,
        }
      );

      if (detailIdArray.includes(sId)) {
        removeDetailId(sId);
        queryClient.invalidateQueries({ queryKey: ["detail-tab-entities"] });
      }
      dispatch(setRowsExpanded(rowsExpanded.filter((r) => r !== sId)));
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      queryClient.invalidateQueries({ queryKey: ["territory"] }).then(() => {
        setStatementId("");
      });
      setSelectedRows(selectedRows.filter((r) => r !== sId));
    },
    onError: (error) => {
      if (
        (error as any).error === "InvalidDeleteError" &&
        (error as any).data &&
        (error as any).data.length > 0
      ) {
        const { data } = error as any;
        toast.warning(
          "Statement cannot be deleted, click to open the conflicting entity in detail",
          {
            autoClose: 6000,
            onClick: () => {
              appendDetailId(data[0]);
            },
          }
        );
      } else {
        toast.error((error as any).message);
      }
    },
  });

  const cloneStatementMutation = useMutation({
    mutationFn: async (entityId: string) => await api.entityClone(entityId),
    onSuccess: (data, variables) => {
      setStatementId(data.data.data.id);
      toast.info(`Statement duplicated!`);
      queryClient.invalidateQueries({ queryKey: ["territory"] });
      queryClient.invalidateQueries({ queryKey: ["entity"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
    },
    onError: () => {
      toast.error(`Error: Statement not duplicated!`);
    },
  });

  const addStatementAtTheEndMutation = useMutation({
    mutationFn: async (newStatement: IStatement) => {
      await api.entityCreate(newStatement);
    },
    onSuccess: (data, variables) => {
      setStatementId(variables.id);
      queryClient.invalidateQueries({ queryKey: ["territory"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      dispatch(setDisableStatementListScroll(false));
    },
  });

  const statementCreateMutation = useMutation({
    mutationFn: async (newStatement: IStatement) =>
      await api.entityCreate(newStatement),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["territory", "statement-list", territoryId],
      });
      setStatementId(variables.id);
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      dispatch(setDisableStatementListScroll(false));
    },
    onError: () => {
      toast.error(`Error: Statement not created!`);
    },
  });
  const territoryCreateMutation = useMutation({
    mutationFn: async (newTerritory: ITerritory) =>
      await api.entityCreate(newTerritory),
    onSuccess: (data, variables) => {
      toast.info(`Sub Teritory created!`);
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      appendDetailId(variables.id);
    },
    onError: () => {
      toast.error(`Error: Sub Territory not created!`);
    },
  });

  const addStatementAtCertainIndex = async (index: number) => {
    let newOrder: number | false = false;

    if (userData) {
      if (index + 1 > statements.length) {
        // last one
        newOrder = EntityEnums.Order.Last;
      } else {
        if (index < 1 && statements[0].data.territory) {
          // first one
          newOrder = EntityEnums.Order.First;
        } else if (
          statements[index - 1].data.territory &&
          statements[index].data.territory
        ) {
          // somewhere between
          newOrder =
            ((
              statements[index - 1].data.territory as {
                order: number;
                territoryId: string;
              }
            ).order +
              (
                statements[index].data.territory as {
                  order: number;
                  territoryId: string;
                }
              ).order) /
            2;
        }
      }

      if (newOrder) {
        const newStatement: IStatement = CStatement(
          localStorage.getItem("userrole") as UserEnums.Role,
          userData.options,
          "",
          "",
          territoryId
        );
        (
          newStatement.data.territory as { order: number; territoryId: string }
        ).order = newOrder;

        statementCreateMutation.mutate(newStatement);
      }
    }
  };

  const statementUpdateMutation = useMutation({
    mutationFn: async (statementObject: { statementId: string; data: {} }) =>
      await api.entityUpdate(statementObject.statementId, {
        data: statementObject.data,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["territory"] });
    },
    onError: () => {
      toast.error(`Error: Statement order not changed!`);
    },
  });

  const moveStatementsMutation = useMutation({
    mutationFn: async (data: {
      statements: string[];
      newTerritoryId: string;
    }) => await api.statementsBatchMove(data.statements, data.newTerritoryId),
    onSuccess: (variables, data) => {
      queryClient.invalidateQueries({ queryKey: ["territory"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      toast.info(
        `${data.statements.length} statement${
          data.statements.length > 1 ? "s" : ""
        } moved`
      );
      setSelectedRows([]);
      setTerritoryId(data.newTerritoryId);
    },
  });

  const duplicateStatementsMutation = useMutation({
    mutationFn: async (data: {
      statements: string[];
      newTerritoryId: string;
    }) => await api.statementsBatchCopy(data.statements, data.newTerritoryId),
    onSuccess: (variables, data) => {
      queryClient.invalidateQueries({ queryKey: ["territory"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      toast.info(
        `${data.statements.length} statement${
          data.statements.length > 1 ? "s" : ""
        } duplicated`
      );
      setSelectedRows([]);
      setTerritoryId(data.newTerritoryId);
    },
  });

  const replaceReferencesMutation = useMutation({
    mutationFn: async (references: IReference[]) =>
      await api.statementsReferencesReplace(selectedRows, references),
    onSuccess: (variables, references) => {
      // TODO:
      queryClient.invalidateQueries({ queryKey: ["statement"] });
    },
  });

  const appendReferencesMutation = useMutation({
    mutationFn: async (references: IReference[]) =>
      await api.statementsReferencesAppend(selectedRows, references),
    onSuccess: (variables, references) => {
      // TODO:
      queryClient.invalidateQueries({ queryKey: ["statement"] });
    },
  });

  const handleCreateStatement = (
    text: string = "",
    statementId: string | undefined = undefined
  ) => {
    if (userData && data) {
      const newStatement: IStatement = CStatement(
        localStorage.getItem("userrole") as UserEnums.Role,
        userData.options,
        "",
        "",
        territoryId,
        statementId
      );
      newStatement.data.text = text;
      addStatementAtTheEndMutation.mutate(newStatement);
    }
  };

  const handleCreateTerritory = (newTerritoryId?: string) => {
    if (userData && data) {
      const newTerritory: ITerritory = CTerritory(
        localStorage.getItem("userrole") as UserEnums.Role,
        userData.options,
        `subT of ${data.labels[0]}`,
        data.detail,
        territoryId,
        EntityEnums.Order.Last,
        newTerritoryId
      );

      console.log(newTerritory);

      territoryCreateMutation.mutate(newTerritory);
    }
  };
  const updateTerritoryMutation = useMutation({
    mutationFn: async (tObject: {
      territoryId: string;
      changes: Partial<ITerritory>;
    }) => await api.entityUpdate(tObject.territoryId, tObject.changes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      queryClient.invalidateQueries({ queryKey: ["territory"] });
    },
  });

  const duplicateTerritoryMutation = useMutation({
    mutationFn: async (tObject: {
      territoryId: string;
      targets: string[];
      withChildren: boolean;
    }) =>
      await api.territoriesCopy(
        tObject.territoryId,
        tObject.targets,
        tObject.withChildren
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      queryClient.invalidateQueries({ queryKey: ["territory"] });
    },
  });

  const deleteStatementsMutation = useMutation({
    mutationFn: () =>
      api.entitiesDelete(selectedRows, { ignoreErrorToast: true }),
    onSuccess: (responseArray, variables) => {
      const currentStatementRowDeleted = responseArray.find(
        (row) => row.entityId === statementId
      );
      if (
        currentStatementRowDeleted &&
        !(currentStatementRowDeleted as any).error
      ) {
        setStatementId("");
      }

      const deletedRows = responseArray.filter((row) => !(row as any).error);
      const deletedIds = (deletedRows as EntitiesDeleteSuccessResponse[]).map(
        (row) => row.entityId
      );

      if (deletedIds.length < selectedRows.length) {
        toast.error(
          `Some statements (${
            selectedRows.length - deletedIds.length
          }) are not possible to delete`
        );
      }

      setSelectedRows(selectedRows.filter((r) => !deletedIds.includes(r)));
      dispatch(
        setRowsExpanded(rowsExpanded.filter((r) => !deletedIds.includes(r)))
      );

      queryClient.invalidateQueries({
        queryKey: ["tree"],
      });
      queryClient.invalidateQueries({
        queryKey: ["territory"],
      });
    },
  });

  const relationsCreateMutation = useMutation({
    mutationFn: async (newRelations: Relation.IRelation[]) =>
      api.relationsCreate(newRelations, { ignoreErrorToast: true }),
    onSuccess: (data, variables) => {
      const errorRows = data.filter((row) => (row as any).error);
      const errorCount = errorRows.length;
      const successCount = data.length - errorCount;

      if (successCount > 0) {
        toast.success(
          `${successCount} relation${successCount === 1 ? "" : "s"} created`
        );
      }
      if (errorCount > 0) {
        if (errorRows[0].details.error === "RelationPathExist") {
          toast.error(
            `${errorCount} relation${
              errorCount === 1 ? "" : "s"
            } to this entity already existed`
          );
        } else {
          toast.error(
            `Some relations ${errorCount} were not possible to create`
          );
        }
      }
      queryClient.invalidateQueries({
        queryKey: ["territory"],
      });
      queryClient.invalidateQueries({
        queryKey: ["entity"],
      });
    },
  });

  const {
    ref: contentRef,
    height: contentHeight = 0,
    width: contentWidth = 0,
  } = useResizeObserver<HTMLDivElement>({
    debounceDelay: displayMode === StatementListDisplayMode.LIST ? 50 : 0,
  });

  const [storedAnnotatorResourceId, setStoredAnnotatorResourceId] = useState<
    string | false
  >(false);
  const [storedAnnotatorScroll, setStoredAnnotatorScroll] = useState<number>(0);

  // so the annotator jumps to the anchor
  useEffect(() => {
    setStoredAnnotatorResourceId(false);
    setStoredAnnotatorScroll(0);
  }, [territoryId]);

  // its needed as the scroll event is executed even when the annotator is not active
  useEffect(() => {
    if (!storedAnnotatorResourceId) {
      setStoredAnnotatorScroll(0);
    }
  }, [storedAnnotatorResourceId]);

  // delay of show content for fluent animation on open
  const [showStatementList, setShowStatementList] = useState(true);
  useEffect(() => {
    if (statementListOpened) {
      setTimeout(() => {
        setShowStatementList(true);
      }, 500);
    } else {
      setShowStatementList(false);
    }
  }, [statementListOpened]);

  const width = useMemo(
    () =>
      displayMode === StatementListDisplayMode.LIST
        ? contentWidth
        : COLLAPSED_TABLE_WIDTH,
    [displayMode, contentWidth]
  );

  return (
    <>
      {showStatementList && (
        <>
          {data && (
            <StatementListHeader
              territory={data}
              isFavorited={isFavorited}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              isAllSelected={
                statements.length > 0 &&
                selectedRows.length === statements.length
              }
              moveStatementsMutation={moveStatementsMutation}
              duplicateStatementsMutation={duplicateStatementsMutation}
              replaceReferencesMutation={replaceReferencesMutation}
              appendReferencesMutation={appendReferencesMutation}
              displayMode={displayMode}
              handleDisplayModeChange={handleDisplayModeChange}
              updateTerritoryMutation={updateTerritoryMutation}
              duplicateTerritoryMutation={duplicateTerritoryMutation}
              deleteStatementsMutation={deleteStatementsMutation}
              relationsCreateMutation={relationsCreateMutation}
            />
          )}

          {!territoryId && (
            <>
              <StyledEmptyState>
                <BsInfoCircle size="23" />
              </StyledEmptyState>
              <StyledEmptyState>
                {"No territory selected yet. Pick one from the territory tree"}
              </StyledEmptyState>
            </>
          )}

          {territoryId &&
            statements.length === 0 &&
            displayMode === StatementListDisplayMode.LIST &&
            statementListOpened &&
            !isFetching && (
              <>
                <StyledEmptyState>
                  <BsInfoCircle size="23" />
                </StyledEmptyState>
                <StyledEmptyState>{"No statements yet."}</StyledEmptyState>
              </>
            )}

          <div
            style={{
              display: "flex",
              height: "100%",
              maxHeight: "calc(100% - 101px)",
              overflow: "auto",
            }}
            ref={contentRef}
          >
            <CustomScrollbar
              scrollerId="Statements"
              elementId="Statements-box-table"
              contentWidth={statements.length > 0 ? width + 10 : 0}
            >
              <StyledTableWrapper
                $isListMode={displayMode === StatementListDisplayMode.LIST}

                // id="Statements-box-table"
              >
                {statements.length > 0 && (
                  <StatementListTable
                    statements={statements}
                    handleRowClick={(rowId: string) => {
                      dispatch(setShowWarnings(false));
                      setStatementId(rowId);
                    }}
                    actantsUpdateMutation={statementUpdateMutation}
                    entities={entities}
                    right={right}
                    cloneStatementMutation={cloneStatementMutation}
                    setStatementToDelete={setStatementToDelete}
                    setShowSubmit={setShowSubmit}
                    addStatementAtCertainIndex={addStatementAtCertainIndex}
                    selectedRows={selectedRows}
                    setSelectedRows={setSelectedRows}
                    displayMode={displayMode}
                    contentWidth={width}
                  />
                )}
              </StyledTableWrapper>
            </CustomScrollbar>

            {data && displayMode === StatementListDisplayMode.TEXT && (
              <StatementListTextAnnotator
                key={territoryId}
                contentHeight={contentHeight}
                contentWidth={contentWidth - 10}
                statements={statements}
                handleCreateStatement={handleCreateStatement}
                handleCreateTerritory={handleCreateTerritory}
                territoryId={territoryId}
                storedAnnotatorResourceId={storedAnnotatorResourceId}
                setStoredAnnotatorResourceId={setStoredAnnotatorResourceId}
                storedAnnotatorScroll={storedAnnotatorScroll}
                setStoredAnnotatorScroll={(newScroll) => {
                  if (storedAnnotatorResourceId) {
                    setStoredAnnotatorScroll(newScroll);
                  }
                }}
                hlEntities={hlEntities}
                setHlEntities={setHlEntities}
                entities={entities}
                right={right}
                setShowSubmit={setShowSubmit}
                addStatementAtCertainIndex={addStatementAtCertainIndex}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
              />
            )}
          </div>

          <Submit
            title="Delete statement"
            text={`Do you really want to delete statement [${
              statementToDelete?.labels[0]
                ? statementToDelete.labels[0]
                : statementToDelete?.id
            }]?`}
            show={showSubmit}
            entityToSubmit={statementToDelete}
            onCancel={() => {
              setShowSubmit(false);
              setStatementToDelete(undefined);
            }}
            onSubmit={() => {
              if (statementToDelete) {
                deleteStatementMutation.mutate(statementToDelete.id);
                setShowSubmit(false);
                setStatementToDelete(undefined);
              }
            }}
            loading={deleteStatementMutation.isPending}
          />
        </>
      )}
      <Loader
        show={
          isFetching ||
          isLoading ||
          deleteStatementMutation.isPending ||
          addStatementAtTheEndMutation.isPending ||
          statementCreateMutation.isPending ||
          statementUpdateMutation.isPending ||
          moveStatementsMutation.isPending ||
          duplicateStatementsMutation.isPending ||
          cloneStatementMutation.isPending ||
          updateTerritoryMutation.isPending ||
          duplicateTerritoryMutation.isPending ||
          deleteStatementsMutation.isPending ||
          relationsCreateMutation.isPending ||
          (statementListOpened && !showStatementList)
        }
      />
    </>
  );
};

export const MemoizedStatementListBox = React.memo(StatementListBox);
