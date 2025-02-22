import { certaintyDict, moodDict, operatorDict } from "@shared/dictionaries";
import { EntityEnums } from "@shared/enums";
import {
  IProp,
  IResponseStatement,
  IStatementAction,
  IStatementData,
} from "@shared/types";
import { excludedSuggesterEntities } from "Theme/constants";
import {
  AttributeIcon,
  BundleButtonGroup,
  Button,
  ButtonGroup,
} from "components";
import Dropdown, {
  ElvlButtonGroup,
  EntityDropzone,
  EntitySuggester,
  EntityTag,
  LogicButtonGroup,
  MoodVariantButtonGroup,
} from "components/advanced";
import { useSearchParams } from "hooks";
import { TooltipAttributes } from "pages/Main/containers";
import { PropGroup } from "pages/Main/containers/PropGroup/PropGroup";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DragSourceMonitor,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from "react-dnd";
import { FaGripVertical, FaPlus, FaTrashAlt } from "react-icons/fa";
import { TbSettingsAutomation, TbSettingsFilled } from "react-icons/tb";
import { setDraggedActantRow } from "redux/features/rowDnd/draggedActantRowSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { ThemeContext } from "styled-components";
import {
  DragItem,
  DraggedActantRowItem,
  DraggedPropRowCategory,
  FilteredActionObject,
  ItemTypes,
} from "types";
import { dndHoverFn } from "utils/utils";
import { StyledSuggesterWrap } from "../StatementEditorActantTable/StatementEditorActantTableStyles";
import {
  StyledBorderLeft,
  StyledExpandedRow,
  StyledFlexStart,
  StyledGrid,
  StyledGridColumn,
} from "./StatementEditorActionTableStyles";

interface StatementEditorActionTableRow {
  filteredAction: FilteredActionObject;
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  statement: IResponseStatement;
  userCanEdit?: boolean;
  updateOrderFn: () => void;
  addProp: (originId: string) => void;
  updateProp: (propId: string, changes: Partial<IProp>) => void;
  removeProp: (propId: string) => void;
  movePropToIndex: (propId: string, oldIndex: number, newIndex: number) => void;
  territoryParentId?: string;
  territoryActants?: string[];
  hasOrder?: boolean;

  handleDataAttributeChange: (
    changes: Partial<IStatementData>,
    instantUpdate?: boolean
  ) => void;
}

export const StatementEditorActionTableRow: React.FC<
  StatementEditorActionTableRow
> = ({
  filteredAction,
  index,
  moveRow,
  statement,
  userCanEdit = false,
  updateOrderFn,
  addProp,
  updateProp,
  removeProp,
  movePropToIndex,
  territoryParentId,
  territoryActants,
  hasOrder,

  handleDataAttributeChange,
}) => {
  const isInsideTemplate = statement.isTemplate || false;
  const { statementId, territoryId } = useSearchParams();
  const { action, sAction } = filteredAction.data;

  const dropRef = useRef<HTMLTableRowElement>(null);
  const dragRef = useRef<HTMLTableCellElement>(null);

  const updateAction = (
    statementActionId: string,
    changes: Partial<IStatementAction>,
    instantUpdate?: boolean
  ) => {
    if (statement && statementActionId) {
      const updatedActions = statement.data.actions.map((a) =>
        a.id === statementActionId ? { ...a, ...changes } : a
      );
      handleDataAttributeChange({ actions: updatedActions }, instantUpdate);
    }
  };
  const removeAction = (statementActionId: string, instantUpdate?: boolean) => {
    if (statement) {
      const updatedActions = statement.data.actions.filter(
        (a) => a.id !== statementActionId
      );
      handleDataAttributeChange({ actions: updatedActions }, instantUpdate);
    }
  };

  const [, drop] = useDrop<DragItem>({
    accept: ItemTypes.ACTION_ROW,
    hover(item: DragItem, monitor: DropTargetMonitor) {
      dndHoverFn(item, index, monitor, dropRef, moveRow);
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.ACTION_ROW,
    item: {
      index,
      id: filteredAction.id.toString(),
    },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item: DragItem | undefined, monitor: DragSourceMonitor) => {
      if (item) updateOrderFn();
    },
  });

  const opacity = isDragging ? 0.2 : 1;

  preview(drop(dropRef));
  drag(dragRef);

  const renderActionCell = () => {
    return action ? (
      <EntityDropzone
        onSelected={(newSelectedId: string) => {
          updateAction(
            sAction.id,
            {
              actionId: newSelectedId,
            },
            true
          );
        }}
        isInsideTemplate={isInsideTemplate}
        categoryTypes={[EntityEnums.Class.Action]}
        excludedEntityClasses={excludedSuggesterEntities}
        territoryParentId={territoryParentId}
        excludedActantIds={[action.id]}
        disabled={!userCanEdit}
      >
        <EntityTag
          fullWidth
          entity={action}
          unlinkButton={
            userCanEdit && {
              onClick: () => {
                updateAction(sAction.id, {
                  actionId: "",
                });
              },
            }
          }
          elvlButtonGroup={
            <ElvlButtonGroup
              value={sAction.elvl}
              onChange={(elvl) =>
                updateAction(sAction.id, {
                  elvl: elvl,
                })
              }
              disabled={!userCanEdit}
            />
          }
        />
      </EntityDropzone>
    ) : (
      <StyledSuggesterWrap>
        <EntitySuggester
          onSelected={(newSelectedId: string) => {
            updateAction(
              sAction.id,
              {
                actionId: newSelectedId,
              },
              true
            );
          }}
          onPicked={(entity) => console.log("entity to temp use", entity)}
          openDetailOnCreate
          categoryTypes={[EntityEnums.Class.Action]}
          excludedEntityClasses={excludedSuggesterEntities}
          placeholder={"add action"}
          isInsideTemplate={isInsideTemplate}
          territoryParentId={territoryParentId}
          territoryActants={territoryActants}
          disabled={!userCanEdit}
        />
      </StyledSuggesterWrap>
    );
  };

  const renderButtonsCell = () => {
    const { actionId: propOriginId, id: rowId } = sAction;

    return (
      <ButtonGroup $noMarginRight $height={19}>
        {userCanEdit && (
          <Button
            key="a"
            icon={<FaPlus />}
            noIconMargin
            label="p"
            color="primary"
            inverted
            tooltipLabel="add new prop"
            onClick={() => {
              addProp(rowId);
            }}
          />
        )}
        {sAction.logic == "2" && (
          <Button
            key="neg"
            tooltipLabel="Negative logic"
            color="danger"
            inverted
            noBorder
            icon={<AttributeIcon attributeName={"negation"} />}
          />
        )}
      </ButtonGroup>
    );
  };

  const dispatch = useAppDispatch();
  const draggedActantRow: DraggedActantRowItem = useAppSelector(
    (state) => state.rowDnd.draggedActantRow
  );

  useEffect(() => {
    if (isDragging) {
      dispatch(
        setDraggedActantRow({ category: DraggedPropRowCategory.ACTION })
      );
      const boxContentEditor = document.getElementById(`box-content-editor`);
      const actionTable = document.getElementById(`action-section`);
      if (boxContentEditor) {
        boxContentEditor.scrollTo({
          behavior: "smooth",
          top: actionTable ? actionTable.offsetTop - 30 : 0,
        });
      }
    } else {
      dispatch(setDraggedActantRow({}));
    }
  }, [isDragging]);

  const renderPropGroup = useCallback(
    (originId: string, props: IProp[], category: DraggedPropRowCategory) => {
      const originActant = statement.entities[originId];

      if (props.length > 0) {
        return (
          <PropGroup
            boxEntity={statement}
            originId={originActant ? originActant.id : ""}
            entities={statement.entities}
            props={props}
            territoryId={territoryId}
            updateProp={updateProp}
            removeProp={removeProp}
            addProp={addProp}
            movePropToIndex={movePropToIndex}
            userCanEdit={userCanEdit}
            openDetailOnCreate
            category={category}
            isInsideTemplate={isInsideTemplate}
            territoryParentId={territoryParentId}
            disableSpareRow
          />
        );
      }
    },
    [statement]
  );

  const isDraggingAction =
    draggedActantRow.category &&
    draggedActantRow.category === DraggedPropRowCategory.ACTION;

  const [isExpanded, setIsExpanded] = useState(false);

  const themeContext = useContext(ThemeContext);

  return (
    <React.Fragment key={index}>
      <StyledFlexStart ref={dropRef}>
        {userCanEdit && hasOrder ? (
          <StyledGridColumn ref={dragRef} style={{ cursor: "move" }}>
            <FaGripVertical
              style={{ marginTop: "0.3rem" }}
              color={themeContext?.color.black}
            />
          </StyledGridColumn>
        ) : (
          <StyledGridColumn />
        )}

        <StyledBorderLeft>
          <StyledGrid style={{ opacity }}>
            <StyledGridColumn>{renderActionCell()}</StyledGridColumn>
            <StyledGridColumn>
              {
                <LogicButtonGroup
                  border
                  value={sAction.logic}
                  onChange={(logic) =>
                    updateAction(sAction.id, { logic: logic })
                  }
                  disabled={!userCanEdit}
                />
              }
            </StyledGridColumn>
            <StyledGridColumn>
              <Dropdown.Multi.Attribute
                width={131}
                disabled={!userCanEdit}
                placeholder="mood"
                tooltipLabel="mood"
                icon={<AttributeIcon attributeName="mood" />}
                options={moodDict}
                value={sAction.mood}
                onChange={(newValues) => {
                  updateAction(sAction.id, {
                    mood: newValues,
                  });
                }}
              />
            </StyledGridColumn>
            <StyledGridColumn>
              <MoodVariantButtonGroup
                border
                onChange={(moodvariant) =>
                  updateAction(sAction.id, {
                    moodvariant: moodvariant,
                  })
                }
                value={sAction.moodvariant}
                disabled={!userCanEdit}
              />
            </StyledGridColumn>
            <StyledGridColumn>{renderButtonsCell()}</StyledGridColumn>
            <StyledGridColumn>
              <Button
                inverted
                onClick={() => setIsExpanded(!isExpanded)}
                icon={
                  isExpanded ? (
                    <TbSettingsFilled size={16} />
                  ) : (
                    <TbSettingsAutomation
                      size={16}
                      style={{ transform: "rotate(90deg)" }}
                    />
                  )
                }
                tooltipContent={
                  <TooltipAttributes
                    data={{
                      elvl: sAction.elvl,
                      certainty: sAction.certainty,
                      logic: sAction.logic,
                      mood: sAction.mood,
                      moodvariant: sAction.moodvariant,
                      bundleOperator: sAction.bundleOperator,
                      bundleStart: sAction.bundleStart,
                      bundleEnd: sAction.bundleEnd,
                    }}
                  />
                }
              />
            </StyledGridColumn>
            <StyledGridColumn>
              {userCanEdit && (
                <Button
                  key="d"
                  icon={<FaTrashAlt />}
                  color="plain"
                  inverted
                  tooltipLabel="remove action row"
                  onClick={() => {
                    removeAction(filteredAction.data.sAction.id);
                  }}
                />
              )}
            </StyledGridColumn>
          </StyledGrid>

          {/* Expanded row */}
          {isExpanded && !isDraggingAction && (
            <StyledExpandedRow>
              <div>
                <Dropdown.Single.Basic
                  width={70}
                  placeholder="logical operator"
                  tooltipLabel="logical operator"
                  icon={<AttributeIcon attributeName="bundleOperator" />}
                  disabled={!userCanEdit}
                  options={operatorDict}
                  value={sAction.bundleOperator}
                  onChange={(newValue) => {
                    updateAction(sAction.id, {
                      bundleOperator: newValue,
                    });
                  }}
                />
              </div>
              <div>
                <BundleButtonGroup
                  bundleStart={sAction.bundleStart}
                  onBundleStartChange={(bundleStart) =>
                    updateAction(sAction.id, {
                      bundleStart: bundleStart,
                    })
                  }
                  bundleEnd={sAction.bundleEnd}
                  onBundleEndChange={(bundleEnd) =>
                    updateAction(sAction.id, {
                      bundleEnd: bundleEnd,
                    })
                  }
                  disabled={!userCanEdit}
                />
              </div>
              <div>
                <Dropdown.Single.Basic
                  width={122}
                  placeholder="certainty"
                  tooltipLabel="certainty"
                  icon={<AttributeIcon attributeName="certainty" />}
                  disabled={!userCanEdit}
                  options={certaintyDict}
                  value={sAction.certainty}
                  onChange={(newValue) => {
                    updateAction(sAction.id, {
                      certainty: newValue,
                    });
                  }}
                />
              </div>
            </StyledExpandedRow>
          )}
        </StyledBorderLeft>
      </StyledFlexStart>

      {/* Prop groups */}
      {!isDraggingAction &&
        renderPropGroup(
          sAction.actionId,
          sAction.props,
          DraggedPropRowCategory.ACTION
        )}
    </React.Fragment>
  );
};
