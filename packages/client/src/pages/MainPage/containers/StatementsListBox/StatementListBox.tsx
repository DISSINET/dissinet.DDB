import { EntityEnums, UserEnums } from "@shared/enums";
import {
  IEntity,
  IReference,
  IResponseStatement,
  IStatement,
} from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import { Loader, Submit, ToastWithLink } from "components";
import { CStatement } from "constructors";
import { useSearchParams } from "hooks";
import React, { useEffect, useState } from "react";
import { BsInfoCircle } from "react-icons/bs";
import { toast } from "react-toastify";
import { setStatementListOpened } from "redux/features/layout/statementListOpenedSlice";
import { setRowsExpanded } from "redux/features/statementList/rowsExpandedSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { StatementListHeader } from "./StatementListHeader/StatementListHeader";
import { StatementListTable } from "./StatementListTable/StatementListTable";
import { StyledEmptyState, StyledTableWrapper } from "./StatementLitBoxStyles";

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
  const rowsExpanded: { [key: string]: boolean } = useAppSelector(
    (state) => state.statementList.rowsExpanded
  );
  const statementListOpened: boolean = useAppSelector(
    (state) => state.layout.statementListOpened
  );

  const {
    territoryId,
    setTerritoryId,
    statementId,
    setStatementId,
    detailIdArray,
    removeDetailId,
    appendDetailId,
  } = useSearchParams();

  useEffect(() => {
    if (!detailIdArray.length && !statementListOpened) {
      dispatch(setStatementListOpened(true));
    }
  }, [detailIdArray, statementListOpened]);

  const [showSubmit, setShowSubmit] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<IStatement>();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const { status, data, error, isFetching } = useQuery(
    ["territory", "statement-list", territoryId, statementListOpened],
    async () => {
      const res = await api.territoryGet(territoryId);
      return res.data;
    },
    {
      enabled: !!territoryId && api.isLoggedIn() && statementListOpened,
    }
  );

  const { statements, entities, right } = data || initialData;

  useEffect(() => {
    if (statements.length !== Object.keys(rowsExpanded).length) {
      const arrayWithIds = statements.map((s, key) => [s.id, false]);
      const arrayWithKeys = Object.fromEntries(arrayWithIds);
      dispatch(setRowsExpanded(arrayWithKeys));
    }
  }, [statements, rowsExpanded]);

  // get user
  const userId = localStorage.getItem("userid");
  const {
    status: userStatus,
    data: userData,
    error: userError,
    isFetching: userIsFetching,
  } = useQuery(
    ["user", userId],
    async () => {
      if (userId) {
        const res = await api.usersGet(userId);
        return res.data;
      }
    },
    { enabled: api.isLoggedIn() && !!userId }
  );

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

  const removeStatementMutation = useMutation(
    async (sId: string) => {
      if (statementId === sId) {
      }
      await api.entityDelete(sId);
    },
    {
      onSuccess: (data, sId) => {
        toast.info(
          <ToastWithLink
            children={`Statement removed!`}
            linkText={"Restore"}
            onLinkClick={async () => {
              const response = await api.entityRestore(sId);
              toast.info("Statement restored");
              queryClient.invalidateQueries(["detail-tab-entities"]);
              queryClient.invalidateQueries(["tree"]);
              queryClient.invalidateQueries(["territory"]);
            }}
          />,
          {
            autoClose: 5000,
          }
        );

        if (detailIdArray.includes(sId)) {
          removeDetailId(sId);
          queryClient.invalidateQueries(["detail-tab-entities"]);
        }
        queryClient.invalidateQueries(["tree"]);
        queryClient.invalidateQueries(["territory"]).then(() => {
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
          toast.info("Click to open conflicting entity in detail", {
            autoClose: 6000,
            onClick: () => {
              appendDetailId(data[0]);
            },
          });
        }
      },
    }
  );

  const cloneStatementMutation = useMutation(
    async (entityId: string) => await api.entityClone(entityId),
    {
      onSuccess: (data, variables) => {
        setStatementId(data.data.data.id);
        toast.info(`Statement duplicated!`);
        queryClient.invalidateQueries(["territory"]);
        queryClient.invalidateQueries(["entity"]);
        queryClient.invalidateQueries(["tree"]);
      },
      onError: () => {
        toast.error(`Error: Statement not duplicated!`);
      },
    }
  );

  const addStatementAtTheEndMutation = useMutation(
    async (newStatement: IStatement) => {
      await api.entityCreate(newStatement);
    },
    {
      onSuccess: (data, variables) => {
        setStatementId(variables.id);
        queryClient.invalidateQueries(["territory"]);
        queryClient.invalidateQueries(["tree"]);
      },
    }
  );

  const actantsCreateMutation = useMutation(
    async (newStatement: IStatement) => await api.entityCreate(newStatement),
    {
      onSuccess: (data, variables) => {
        toast.info(`Statement created!`);
        queryClient.invalidateQueries([
          "territory",
          "statement-list",
          territoryId,
        ]);
        setStatementId(variables.id);
        queryClient.invalidateQueries(["tree"]);
      },
      onError: () => {
        toast.error(`Error: Statement not created!`);
      },
    }
  );

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

        actantsCreateMutation.mutate(newStatement);
      }
    }
  };

  const statementUpdateMutation = useMutation(
    async (statementObject: { statementId: string; data: {} }) =>
      await api.entityUpdate(statementObject.statementId, {
        data: statementObject.data,
      }),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(["territory"]);
      },
      onError: () => {
        toast.error(`Error: Statement order not changed!`);
      },
    }
  );

  const moveTerritoryMutation = useMutation(
    async (newParentId: string) =>
      await api.treeMoveTerritory(territoryId, newParentId, 0),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(["tree"]);
        queryClient.invalidateQueries(["territory"]);
      },
    }
  );

  const updateTerritoryMutation = useMutation(
    async (tObject: {
      territoryId: string;
      statements: IResponseStatement[];
    }) =>
      await api.entityUpdate(tObject.territoryId, {
        statements: tObject.statements,
      }),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(["territory"]);
      },
    }
  );

  const moveStatementsMutation = useMutation(
    async (data: { statements: string[]; newTerritoryId: string }) =>
      await api.statementsBatchMove(data.statements, data.newTerritoryId),
    {
      onSuccess: (variables, data) => {
        queryClient.invalidateQueries(["territory"]);
        queryClient.invalidateQueries(["tree"]);
        toast.info(
          `${data.statements.length} statement${
            data.statements.length > 1 ? "s" : ""
          } moved`
        );
        setSelectedRows([]);
        setTerritoryId(data.newTerritoryId);
      },
    }
  );

  const duplicateStatementsMutation = useMutation(
    async (data: { statements: string[]; newTerritoryId: string }) =>
      await api.statementsBatchCopy(data.statements, data.newTerritoryId),
    {
      onSuccess: (variables, data) => {
        queryClient.invalidateQueries(["territory"]);
        queryClient.invalidateQueries(["tree"]);
        toast.info(
          `${data.statements.length} statement${
            data.statements.length > 1 ? "s" : ""
          } duplicated`
        );
        setSelectedRows([]);
        setTerritoryId(data.newTerritoryId);
      },
    }
  );

  const replaceReferencesMutation = useMutation(
    async (references: IReference[]) =>
      await api.statementsReferencesReplace(selectedRows, references),
    {
      onSuccess: (variables, references) => {
        // TODO:
        queryClient.invalidateQueries(["statement"]);
      },
    }
  );

  const appendReferencesMutation = useMutation(
    async (references: IReference[]) =>
      await api.statementsReferencesAppend(selectedRows, references),
    {
      onSuccess: (variables, references) => {
        // TODO:
        queryClient.invalidateQueries(["statement"]);
      },
    }
  );

  return (
    <>
      {data && (
        <StatementListHeader
          data={data}
          addStatementAtTheEndMutation={addStatementAtTheEndMutation}
          moveTerritoryMutation={moveTerritoryMutation}
          updateTerritoryMutation={updateTerritoryMutation}
          isFavorited={isFavorited}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          isAllSelected={
            statements.length > 0 && selectedRows.length === statements.length
          }
          moveStatementsMutation={moveStatementsMutation}
          duplicateStatementsMutation={duplicateStatementsMutation}
          replaceReferencesMutation={replaceReferencesMutation}
          appendReferencesMutation={appendReferencesMutation}
        />
      )}
      {statements ? (
        <StyledTableWrapper id="Statements-box-table">
          <StatementListTable
            statements={statements}
            handleRowClick={(rowId: string) => {
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
          />
        </StyledTableWrapper>
      ) : (
        <>
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
        </>
      )}

      <Submit
        title="Delete statement"
        text={`Do you really want to delete statement [${
          statementToDelete?.label
            ? statementToDelete.label
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
            removeStatementMutation.mutate(statementToDelete.id);
            setShowSubmit(false);
            setStatementToDelete(undefined);
          }
        }}
        loading={removeStatementMutation.isLoading}
      />
      <Loader
        show={
          isFetching ||
          removeStatementMutation.isLoading ||
          addStatementAtTheEndMutation.isLoading ||
          actantsCreateMutation.isLoading ||
          statementUpdateMutation.isLoading ||
          moveTerritoryMutation.isLoading ||
          moveStatementsMutation.isLoading ||
          duplicateStatementsMutation.isLoading ||
          cloneStatementMutation.isLoading
        }
      />
    </>
  );
};

export const MemoizedStatementListBox = React.memo(StatementListBox);
