import { entitiesDictKeys } from "@shared/dictionaries";
import { EntityEnums, RelationEnums, UserEnums } from "@shared/enums";
import {
  IEntity,
  IReference,
  IResponseGeneric,
  IResponseTerritory,
  IResponseTree,
  ITerritory,
  Relation,
} from "@shared/types";
import {
  UseMutationResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { rootTerritoryId } from "Theme/constants";
import api from "api";
import { AxiosResponse } from "axios";
import { Button, ButtonGroup, Submit, Tooltip } from "components";
import Dropdown, {
  BreadcrumbItem,
  EntitySuggester,
  TerritoryActionModal,
} from "components/advanced";
import { useSearchParams } from "hooks";
import React, { useEffect, useMemo, useState } from "react";
import { FaHighlighter, FaList, FaTrash } from "react-icons/fa";
import {
  MdOutlineCheckBox,
  MdOutlineCheckBoxOutlineBlank,
  MdOutlineIndeterminateCheckBox,
} from "react-icons/md";
import { TbHomeMove } from "react-icons/tb";
import { setLastClickedIndex } from "redux/features/statementList/lastClickedIndexSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import {
  DropdownItem,
  EntitiesDeleteErrorResponse,
  EntitiesDeleteSuccessResponse,
  RelationsCreateErrorResponse,
  RelationsCreateSuccessResponse,
  StatementListDisplayMode,
} from "types";
import { collectTerritoryChildren, searchTree } from "utils/utils";
import { v4 as uuidv4 } from "uuid";
import {
  StyledActionsWrapper,
  StyledCheckboxWrapper,
  StyledCounter,
  StyledDropdownWrap,
  StyledFaStar,
  StyledHeader,
  StyledHeaderBreadcrumbRow,
  StyledHeaderRow,
  StyledHeading,
  StyledInfoText,
  StyledMoveToParent,
  StyledSuggesterRow,
} from "./StatementListHeaderStyles";

interface StatementListHeader {
  territory: IResponseTerritory;
  isFavorited?: boolean;

  displayMode: StatementListDisplayMode;
  handleDisplayModeChange: (newMode: StatementListDisplayMode) => void;

  isAllSelected: boolean;
  selectedRows: string[];
  setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>;

  // Statements batch actions
  moveStatementsMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    {
      statements: string[];
      newTerritoryId: string;
    },
    unknown
  >;
  duplicateStatementsMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    {
      statements: string[];
      newTerritoryId: string;
    },
    unknown
  >;
  replaceReferencesMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    IReference[],
    unknown
  >;
  appendReferencesMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    IReference[],
    unknown
  >;
  updateTerritoryMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric<any>, any>,
    Error,
    {
      territoryId: string;
      changes: Partial<ITerritory>;
    },
    unknown
  >;
  duplicateTerritoryMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric<any>, any>,
    Error,
    {
      territoryId: string;
      targets: string[];
      withChildren: boolean;
    },
    unknown
  >;
  deleteStatementsMutation: UseMutationResult<
    (EntitiesDeleteSuccessResponse | EntitiesDeleteErrorResponse)[],
    Error,
    void,
    unknown
  >;
  relationsCreateMutation: UseMutationResult<
    (RelationsCreateSuccessResponse | RelationsCreateErrorResponse)[],
    Error,
    Relation.IRelation[],
    unknown
  >;
}
export const StatementListHeader: React.FC<StatementListHeader> = ({
  territory,

  isFavorited,
  isAllSelected,
  selectedRows,
  setSelectedRows,

  displayMode,
  handleDisplayModeChange,

  moveStatementsMutation,
  duplicateStatementsMutation,
  replaceReferencesMutation,
  appendReferencesMutation,

  updateTerritoryMutation,
  duplicateTerritoryMutation,

  deleteStatementsMutation,
  relationsCreateMutation,
}) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { territoryId, setTerritoryId } = useSearchParams();

  enum BatchOption {
    move_S = "move_S",
    duplicate_S = "duplicate_S",
    delete_S = "delete_S",
    replace_R = "replace_R",
    append_R = "append_R",
    relate_to_SOE = "relate_to_SOE",
    classify_as = "classify_as",
  }
  const batchOptions = [
    {
      value: BatchOption.move_S,
      label: `move`,
      info: EntityEnums.Class.Territory,
    },
    {
      value: BatchOption.duplicate_S,
      label: `duplicate`,
      info: EntityEnums.Class.Territory,
    },
    {
      value: BatchOption.delete_S,
      label: `delete`,
      info: "",
    },
    {
      value: BatchOption.replace_R,
      label: `replace a referenced Resource`,
      info: EntityEnums.Class.Resource,
    },
    {
      value: BatchOption.append_R,
      label: `append a referenced Resource`,
      info: EntityEnums.Class.Resource,
    },
    {
      value: BatchOption.relate_to_SOE,
      label: `relate to superordinate entity`,
      info: EntityEnums.Class.Event,
    },
    {
      value: BatchOption.classify_as,
      label: `classify as`,
      info: EntityEnums.Class.Concept,
    },
  ];

  const handleOnSelected = (newSelectedId: string) => {
    switch (batchAction.value) {
      case BatchOption.move_S:
        moveStatementsMutation.mutate({
          statements: selectedRows,
          newTerritoryId: newSelectedId,
        });
        return;
      case BatchOption.duplicate_S:
        duplicateStatementsMutation.mutate({
          statements: selectedRows,
          newTerritoryId: newSelectedId,
        });
        return;
      case BatchOption.append_R:
        appendReferencesMutation.mutate([
          {
            id: uuidv4(),
            resource: newSelectedId,
            value: "",
          },
        ]);
        return;
      case BatchOption.replace_R:
        replaceReferencesMutation.mutate([
          {
            id: uuidv4(),
            resource: newSelectedId,
            value: "",
          },
        ]);
        return;
      case BatchOption.relate_to_SOE:
        const newRelations = [];
        for (const statementId of selectedRows) {
          newRelations.push({
            id: uuidv4(),
            entityIds: [statementId, newSelectedId],
            type: RelationEnums.Type.SuperordinateEntity,
          } as Relation.IRelation);
        }
        relationsCreateMutation.mutate(newRelations);
        return;
      case BatchOption.classify_as:
        const newRelationsCla = [];
        for (const statementId of selectedRows) {
          newRelationsCla.push({
            id: uuidv4(),
            entityIds: [statementId, newSelectedId],
            type: RelationEnums.Type.Classification,
          } as Relation.IRelation);
        }
        relationsCreateMutation.mutate(newRelationsCla);
        return;
    }
  };

  // get user data
  const userId = localStorage.getItem("userid");
  const {
    status: statusUser,
    data: user,
    error: errorUser,
    isFetching: isFetchingUser,
  } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      if (userId) {
        const res = await api.usersGet(userId);
        return res.data;
      }
    },
    enabled: !!userId && api.isLoggedIn(),
  });

  const treeData: IResponseTree | undefined = queryClient.getQueryData([
    "tree",
  ]);

  const [excludedMoveTerritories, setExcludedMoveTerritories] = useState<
    string[]
  >([territoryId]);

  useEffect(() => {
    setSelectedRows([]);
  }, [territoryId]);

  useEffect(() => {
    const toExclude = [territoryId];
    if (treeData) {
      const currentTerritory = searchTree(treeData, territoryId);
      if (currentTerritory?.territory.data.parent) {
        toExclude.push(currentTerritory.territory.data.parent.territoryId);
      }
      if (currentTerritory) {
        const childArr = collectTerritoryChildren(currentTerritory);
        if (childArr.length) {
          setExcludedMoveTerritories([...toExclude, ...childArr]);
        } else {
          setExcludedMoveTerritories(toExclude);
        }
      }
    }
  }, [treeData, territoryId]);

  const selectedTerritoryPath = useAppSelector(
    (state) => state.territoryTree.selectedTerritoryPath
  );

  const handleSelectAll = (checked: boolean) =>
    checked
      ? setSelectedRows(territory.statements.map((statement) => statement.id))
      : setSelectedRows([]);

  const renderCheckBox = () => {
    const size = 18;

    if (isAllSelected) {
      return (
        <MdOutlineCheckBox
          size={size}
          onClick={() => {
            handleSelectAll(false);
            dispatch(setLastClickedIndex(-1));
          }}
        />
      );
    } else if (selectedRows.length > 0) {
      // some rows selected
      return (
        <MdOutlineIndeterminateCheckBox
          size={size}
          onClick={() => {
            handleSelectAll(false);
            dispatch(setLastClickedIndex(-1));
          }}
        />
      );
    } else {
      return (
        <MdOutlineCheckBoxOutlineBlank
          size={size}
          onClick={() => handleSelectAll(true)}
        />
      );
    }
  };

  const [batchAction, setBatchAction] = useState<DropdownItem>(batchOptions[0]);
  const [showTActionModal, setShowTActionModal] = useState(false);
  const [moveToParentEntity, setMoveToParentEntity] = useState<IEntity | false>(
    false
  );

  const userCanEdit = territory.right !== UserEnums.RoleMode.Read;

  const [headingHovered, setHeadingHovered] = useState(false);
  const [referenceElement, setReferenceElement] =
    useState<HTMLSpanElement | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  const BreadcrumbItems = useMemo(() => {
    return (
      <React.Fragment>
        {selectedTerritoryPath?.map((territoryId: string, key: number) => {
          return (
            <React.Fragment key={key}>
              <BreadcrumbItem territoryId={territoryId} />
            </React.Fragment>
          );
        })}
        <React.Fragment key="this-territory">
          <BreadcrumbItem territoryId={territoryId} territoryData={territory} />
        </React.Fragment>
      </React.Fragment>
    );
  }, [selectedTerritoryPath.join(",")]);

  return (
    <>
      <Tooltip
        label={territory.labels[0]}
        visible={headingHovered}
        referenceElement={referenceElement}
      />

      <StyledHeader>
        <StyledHeaderBreadcrumbRow>{BreadcrumbItems}</StyledHeaderBreadcrumbRow>

        <StyledHeaderRow>
          <span style={{ display: "grid", gridTemplateColumns: "auto auto" }}>
            {isFavorited && <StyledFaStar size={16} />}
            {territoryId ? (
              <StyledHeading
                ref={setReferenceElement}
                onMouseEnter={() => setHeadingHovered(true)}
                onMouseLeave={() => setHeadingHovered(false)}
              >{`T:\xa0${territory.labels[0]}`}</StyledHeading>
            ) : (
              <StyledHeading>{"no territory selected"}</StyledHeading>
            )}
          </span>

          {territory.id !== rootTerritoryId && userCanEdit && (
            <StyledMoveToParent>
              <EntitySuggester
                placeholder="new parent"
                disableTemplatesAccept
                filterEditorRights
                inputWidth={96}
                disableCreate
                categoryTypes={[EntityEnums.Class.Territory]}
                onPicked={(selectedEntity) => {
                  setMoveToParentEntity(selectedEntity);
                  setShowTActionModal(true);
                }}
                excludedActantIds={excludedMoveTerritories}
                button={
                  <Button
                    icon={<TbHomeMove size={14} />}
                    onClick={() => setShowTActionModal(true)}
                    tooltipLabel="move or duplicate current territory"
                  />
                }
              />
            </StyledMoveToParent>
          )}
        </StyledHeaderRow>

        <StyledSuggesterRow>
          {/* BATCH ACTIONS */}
          <StyledActionsWrapper>
            {user?.role !== UserEnums.Role.Viewer &&
              territory.statements.length > 0 && (
                <>
                  <StyledCheckboxWrapper>
                    {renderCheckBox()}
                  </StyledCheckboxWrapper>

                  {selectedRows.length > 0 && (
                    <StyledCounter>{`${selectedRows.length}/${territory.statements.length}`}</StyledCounter>
                  )}

                  {
                    <>
                      <StyledDropdownWrap>
                        <Dropdown.Single.Basic
                          tooltipLabel={
                            batchAction.info === EntityEnums.Class.Resource
                              ? batchAction.label
                              : ""
                          }
                          width={98}
                          disabled={selectedRows.length === 0}
                          value={batchAction.value}
                          onChange={(selectedOption) =>
                            setBatchAction(
                              batchOptions.find(
                                (o) => o.value === selectedOption
                              )!
                            )
                          }
                          options={batchOptions}
                        />
                      </StyledDropdownWrap>

                      {/* Batch delete */}
                      {batchAction.value === BatchOption.delete_S && (
                        <Button
                          icon={<FaTrash />}
                          color="danger"
                          inverted
                          onClick={() => setShowSubmit(true)}
                          tooltipLabel="delete selected statements"
                        />
                      )}

                      {batchAction.info && (
                        <EntitySuggester
                          inputWidth={70}
                          placeholder={
                            batchAction.info === EntityEnums.Class.Territory
                              ? "to territory"
                              : ""
                          }
                          disableTemplatesAccept
                          filterEditorRights
                          categoryTypes={[
                            entitiesDictKeys[
                              batchAction.info as EntityEnums.Class
                            ].value,
                          ]}
                          onSelected={(newSelectedId: string) =>
                            handleOnSelected(newSelectedId)
                          }
                          excludedActantIds={[territory.id]}
                          disabled={selectedRows.length === 0}
                        />
                      )}
                    </>
                  }
                </>
              )}
          </StyledActionsWrapper>

          <StyledInfoText>
            {"Mode "}
            <ButtonGroup style={{ marginLeft: "5px" }}>
              <Button
                color="success"
                icon={<FaList />}
                label={`list (${territory.statements.length})`}
                onClick={() => {
                  handleDisplayModeChange(StatementListDisplayMode.LIST);
                }}
                inverted={displayMode === StatementListDisplayMode.TEXT}
              ></Button>
              <Button
                color="success"
                icon={<FaHighlighter />}
                label="annotator"
                onClick={() => {
                  handleDisplayModeChange(StatementListDisplayMode.TEXT);
                }}
                inverted={displayMode === StatementListDisplayMode.LIST}
              ></Button>
            </ButtonGroup>
          </StyledInfoText>
        </StyledSuggesterRow>
      </StyledHeader>

      {showTActionModal && (
        <TerritoryActionModal
          onClose={() => setShowTActionModal(false)}
          selectedParentEntity={moveToParentEntity}
          setMoveToParentEntity={setMoveToParentEntity}
          showModal={showTActionModal}
          territory={territory}
          updateTerritoryMutation={updateTerritoryMutation}
          excludedMoveTerritories={excludedMoveTerritories}
          duplicateTerritoryMutation={duplicateTerritoryMutation}
        />
      )}
      <Submit
        show={showSubmit}
        title="Delete entities"
        text={`Do you really want to delete ${selectedRows.length} statements?`}
        submitLabel="Delete"
        loading={deleteStatementsMutation.isPending}
        onSubmit={() => {
          deleteStatementsMutation.mutate();
          setShowSubmit(false);
        }}
        onCancel={() => setShowSubmit(false)}
      />
    </>
  );
};
