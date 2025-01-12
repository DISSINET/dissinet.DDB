import { config, useSpring } from "@react-spring/web";
import { EntityEnums, UserEnums } from "@shared/enums";
import { ITerritory, IUser } from "@shared/types";
import { IParentTerritory } from "@shared/types/territory";
import {
  UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { rootTerritoryId } from "Theme/constants";
import api from "api";
import { EntityDropzone, EntityTag } from "components/advanced";
import { useSearchParams } from "hooks";
import update from "immutability-helper";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { setDisableTreeScroll } from "redux/features/territoryTree/disableTreeScrollSlice";
import { setTreeInitialized } from "redux/features/territoryTree/treeInitializeSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { ThemeContext } from "styled-components";
import {
  DraggedEntityReduxItem,
  EntityDragItem,
  IExtendedResponseTree,
} from "types";
import { TerritoryTreeContextMenu } from "../TerritoryTreeContextMenu/TerritoryTreeContextMenu";
import TerritoryTreeNodeArrowIcon from "./TerritoryTreeNodeArrowIcon";
import {
  StyledChildrenWrap,
  StyledDisabledTag,
  StyledIconWrap,
  StyledTerritoryTagWrap,
} from "./TerritoryTreeNodeStyles";

interface TerritoryTreeNode {
  territory: ITerritory;
  children: IExtendedResponseTree[];
  lvl: number;
  statementsCount: number;
  initExpandedNodes?: string[];
  propId?: string;
  index?: number;
  moveFn?: (dragIndex: number, hoverIndex: number) => void;
  empty?: boolean;
  foundByRecursion?: boolean;
  right: UserEnums.RoleMode;
  storedTerritories: string[];
  updateUserMutation: UseMutationResult<void, unknown, Partial<IUser>, unknown>;
}
export const TerritoryTreeNode: React.FC<TerritoryTreeNode> = ({
  territory,
  children,
  lvl,
  statementsCount,
  initExpandedNodes = [],
  propId,
  index,
  moveFn,
  empty,
  foundByRecursion,
  right,
  storedTerritories,
  updateUserMutation,
}) => {
  const dispatch = useAppDispatch();
  const treeInitialized = useAppSelector((state) => state.treeInitialized);
  const queryClient = useQueryClient();

  const { territoryId, setTerritoryId } = useSearchParams();

  const isSelected = territoryId === territory.id;

  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [childTerritories, setChildTerritories] = useState<
    IExtendedResponseTree[]
  >([]);

  const animatedStyle = useSpring({
    opacity: contextMenuOpen ? 0.6 : 1,
    display: "inline-flex",
    overflow: "hidden",
    config: config.stiff,
  });

  const themeContext = useContext(ThemeContext);

  useEffect(() => {
    setChildTerritories(children);
  }, [children]);

  useEffect(() => {
    if (!treeInitialized) {
      const shouldExpand = initExpandedNodes.some(
        (node) => node === territory.id
      );
      if (shouldExpand) {
        setIsExpanded(true);
      } else if (territoryId === territory.id) {
        setIsExpanded(true);
        dispatch(setTreeInitialized(true));
      } else if (territory.id === rootTerritoryId) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
      }
    }
  }, [treeInitialized, initExpandedNodes]);

  const moveChildFn = useCallback((dragIndex: number, hoverIndex: number) => {
    setChildTerritories((childTerritories) =>
      update(childTerritories, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, childTerritories[dragIndex]],
        ],
      })
    );
  }, []);

  const moveTerritoryMutation = useMutation({
    mutationFn: async (item: EntityDragItem) => {
      if (territory.data.parent && item.index !== -1) {
        const parent = territory.data.parent as IParentTerritory;
        await api.treeMoveTerritory(item.id, parent.territoryId, item.index);
      }
    },
    onSuccess: () => {
      dispatch(setDisableTreeScroll(true));
      queryClient.invalidateQueries({ queryKey: ["tree"] });
    },
  });

  const draggedEntity: DraggedEntityReduxItem = useAppSelector(
    (state) => state.draggedEntity
  );

  const [tempDisabled, setTempDisabled] = useState(false);
  const [hideChildTerritories, setHideChildTerritories] = useState(false);

  useEffect(() => {
    if (
      draggedEntity.parentId &&
      draggedEntity.parentId !==
        (territory.data.parent as IParentTerritory).territoryId &&
      draggedEntity.parentId !== propId
    ) {
      if (draggedEntity.lvl && draggedEntity.lvl > lvl) {
        setTempDisabled(true);
      }
    } else {
      setTempDisabled(false);
    }

    if (draggedEntity.parentId) {
      if (draggedEntity.lvl && draggedEntity.lvl === lvl) {
        setHideChildTerritories(true);
      }
    } else {
      setHideChildTerritories(false);
    }
  }, [draggedEntity]);

  const hasChildren = children.length > 0;
  const { id, data } = territory;
  const parent = data.parent as IParentTerritory;
  const isFavorited = storedTerritories?.includes(id);

  const handleMenuOpen = useCallback(() => {
    setContextMenuOpen(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setContextMenuOpen(false);
  }, []);

  const handleIconClick = useCallback(() => {
    setTerritoryId(territory.id);
    if (hasChildren) {
      setIsExpanded((prevIsExpanded) => !prevIsExpanded);
    }
  }, [hasChildren, territoryId]);

  const moveStatementsMutation = useMutation({
    mutationFn: async (data: {
      statements: string[];
      newTerritoryId: string;
    }) => await api.statementsBatchMove(data.statements, data.newTerritoryId),
    onSuccess: (variables, data) => {
      queryClient.invalidateQueries({ queryKey: ["territory"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      toast.info(`statement moved`);
      // could be redirected to newTerritory
      // setTerritoryId(data.newTerritoryId);
    },
  });

  return (
    <>
      <>
        {!tempDisabled ? (
          <StyledTerritoryTagWrap
            id={`territory${id}`}
            style={{
              backgroundColor: foundByRecursion
                ? themeContext?.color.foundByTreeFilter
                : "",
              opacity: animatedStyle.opacity,
            }}
          >
            <StyledIconWrap onClick={handleIconClick}>
              <TerritoryTreeNodeArrowIcon
                territoryId={id}
                isExpanded={isExpanded}
                empty={empty ?? false}
                hasChildren={hasChildren}
                statementsCount={statementsCount}
                right={right}
              />
            </StyledIconWrap>
            <EntityDropzone
              onSelected={(newSelectedId: string) => {
                moveStatementsMutation.mutate({
                  statements: [newSelectedId],
                  newTerritoryId: territory.id,
                });
              }}
              disableTemplatesAccept
              categoryTypes={[EntityEnums.Class.Statement]}
              disabled={right === UserEnums.RoleMode.Read}
              // ideally statements in current T
              // excludedActantIds={[territory.data]}
            >
              <EntityTag
                entity={territory}
                parentId={parent.territoryId}
                lvl={lvl}
                isSelected={isSelected}
                index={index}
                fullWidth
                moveFn={moveFn}
                updateOrderFn={moveTerritoryMutation.mutate}
                statementsCount={statementsCount}
                isFavorited={isFavorited}
                showOnly="label"
                tooltipPosition="right"
              />
            </EntityDropzone>
            <TerritoryTreeContextMenu
              territoryActant={territory}
              onMenuOpen={handleMenuOpen}
              onMenuClose={handleMenuClose}
              right={right}
              empty={(empty && !children.length) || false}
              storedTerritories={storedTerritories}
              updateUserMutation={updateUserMutation}
              isFavorited={isFavorited}
            />
          </StyledTerritoryTagWrap>
        ) : (
          <StyledDisabledTag />
        )}
      </>

      <StyledChildrenWrap>
        {!hideChildTerritories &&
          isExpanded &&
          childTerritories.map((child: IExtendedResponseTree, key: number) => (
            <MemoizedTerritoryTreeNode
              key={key}
              index={key}
              propId={child.territory.id}
              territory={child.territory}
              children={child.children}
              right={child.right}
              lvl={child.lvl}
              statementsCount={child.statementsCount}
              initExpandedNodes={initExpandedNodes}
              empty={child.empty}
              foundByRecursion={child.foundByRecursion}
              moveFn={moveChildFn}
              storedTerritories={storedTerritories}
              updateUserMutation={updateUserMutation}
            />
          ))}
      </StyledChildrenWrap>
    </>
  );
};

export const MemoizedTerritoryTreeNode = React.memo(TerritoryTreeNode);
