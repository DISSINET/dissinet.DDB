import { EntityEnums, UserEnums } from "@shared/enums";
import { IResponseTree, IUser } from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import { Button, ButtonGroup, CustomScrollbar, Loader } from "components";
import { EntityCreateModal } from "components/advanced";
import { useSearchParams } from "hooks";
import React, { useEffect, useState } from "react";
import { BsFilter } from "react-icons/bs";
import { FaPlus } from "react-icons/fa";
import { setFilterOpen } from "redux/features/territoryTree/filterOpenSlice";
import { setSelectedTerritoryPath } from "redux/features/territoryTree/selectedTerritoryPathSlice";
import { setTreeInitialized } from "redux/features/territoryTree/treeInitializeSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { ITerritoryFilter } from "types";
import { searchTree } from "utils/utils";
import { StyledNoResults, StyledTreeWrapper } from "./TerritoryTreeBoxStyles";
import { TerritoryTreeFilter } from "./TerritoryTreeFilter/TerritoryTreeFilter";
import {
  filterTreeByFavorites,
  filterTreeByLabel,
  filterTreeNonEmpty,
  filterTreeWithWriteRights,
  markNodesWithFilters,
} from "./TerritoryTreeFilterUtils";
import { MemoizedTerritoryTreeNode } from "./TerritoryTreeNode/TerritoryTreeNode";

const initFilterSettings: ITerritoryFilter = {
  nonEmpty: false,
  starred: false,
  editorRights: false,
  filter: "",
};
export const TerritoryTreeBox: React.FC = () => {
  const firstPanelExpanded: boolean = useAppSelector(
    (state) => state.layout.firstPanelExpanded
  );

  const queryClient = useQueryClient();

  const {
    status,
    data: treeData,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["tree"],
    queryFn: async () => {
      const res = await api.treeGet();
      return res.data;
    },
    enabled: api.isLoggedIn(),
  });
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

  const updateUserMutation = useMutation({
    mutationFn: async (changes: Partial<IUser>) => {
      if (userId) {
        await api.usersUpdate(userId, changes);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const userRole = localStorage.getItem("userrole");
  const { territoryId } = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);

  const dispatch = useAppDispatch();
  const selectedTerritoryPath = useAppSelector(
    (state) => state.territoryTree.selectedTerritoryPath
  );

  const [filterSettings, setFilterSettings] =
    useState<ITerritoryFilter>(initFilterSettings);
  const [filteredTreeData, setFilteredTreeData] =
    useState<IResponseTree | null>();

  useEffect(() => {
    if (treeData) {
      if (
        JSON.stringify(filterSettings) === JSON.stringify(initFilterSettings)
      ) {
        setFilteredTreeData(treeData);
      } else {
        // use filter - fn that returns new object with filtered tree and set to state
        setFilteredTreeData(getFilteredTreeData());
      }
    }
  }, [treeData, filterSettings, userData]);

  const handleFilterChange = (
    key: keyof ITerritoryFilter,
    value: boolean | string
  ) => setFilterSettings({ ...filterSettings, [key]: value });

  const getFilteredTreeData = () => {
    if (treeData) {
      let newFilteredTreeData: IResponseTree | null = treeData;

      if (filterSettings.nonEmpty) {
        // NON EMPTY
        const nonEmptyTreeData = filterTreeNonEmpty(newFilteredTreeData);
        newFilteredTreeData = nonEmptyTreeData;
      }
      if (filterSettings.starred) {
        // STARED
        if (userData) {
          const starredTreeData = filterTreeByFavorites(
            newFilteredTreeData,
            userData.storedTerritories.map((t) => t.territory.id)
          );
          newFilteredTreeData = starredTreeData;
        }
      }
      if (filterSettings.editorRights) {
        // EDITOR RIGHTS
        const editorRightsTreeData =
          filterTreeWithWriteRights(newFilteredTreeData);
        newFilteredTreeData = editorRightsTreeData;
      }
      if (filterSettings.filter.length > 0) {
        // LABEL FILTER
        const labelFilterTreeData = filterTreeByLabel(
          newFilteredTreeData,
          filterSettings.filter
        );
        newFilteredTreeData = labelFilterTreeData;
      }

      // Mark tree data when all selected conditions are satisfied
      if (newFilteredTreeData && userData) {
        const markedTreeData = markNodesWithFilters(
          newFilteredTreeData,
          filterSettings,
          userData.storedTerritories.map((t) => t.territory.id)
        );
        return markedTreeData;
      }

      return newFilteredTreeData;
    }
  };

  useEffect(() => {
    if (filteredTreeData) {
      const foundTerritory = searchTree(filteredTreeData, territoryId);
      if (foundTerritory) {
        dispatch(setSelectedTerritoryPath(foundTerritory.path));
      }
    }
  }, [filteredTreeData, territoryId]);

  const treeFilterOpen: boolean = useAppSelector(
    (state) => state.territoryTree.filterOpen
  );

  return (
    <>
      <ButtonGroup>
        {(userRole === UserEnums.Role.Admin ||
          userRole === UserEnums.Role.Owner) && (
          <Button
            label="new"
            iconRight={<span style={{ marginLeft: 5 }}>{"\u0054"}</span>}
            icon={<FaPlus />}
            onClick={() => setShowCreate(true)}
            fullWidth
          />
        )}
        <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
          <Button
            label="filter"
            onClick={() => {
              if (treeFilterOpen) {
                dispatch(setFilterOpen(false));
                setFilteredTreeData(treeData);
                setFilterSettings(initFilterSettings);
                dispatch(setTreeInitialized(false));
              } else {
                dispatch(setFilterOpen(true));
              }
            }}
            color="success"
            inverted={!treeFilterOpen}
            fullWidth
            icon={<BsFilter />}
            tooltipPosition="right"
          />
        </div>
      </ButtonGroup>

      {treeFilterOpen && (
        <TerritoryTreeFilter
          filterData={filterSettings}
          handleFilterChange={(key, value) => handleFilterChange(key, value)}
          userRole={userRole}
        />
      )}

      {firstPanelExpanded && (
        <CustomScrollbar
          scrollerId="Territories"
          elementId="Territories-box-content"
        >
          <StyledTreeWrapper
          // id="Territories-box-content"
          >
            {filteredTreeData && (
              <MemoizedTerritoryTreeNode
                right={filteredTreeData.right}
                territory={filteredTreeData.territory}
                children={filteredTreeData.children}
                lvl={filteredTreeData.lvl}
                statementsCount={filteredTreeData.statementsCount}
                initExpandedNodes={selectedTerritoryPath}
                empty={filteredTreeData.empty}
                storedTerritories={storedTerritoryIds ? storedTerritoryIds : []}
                updateUserMutation={updateUserMutation}
              />
            )}

            {/* No results */}
            {treeFilterOpen && !filteredTreeData && (
              <StyledNoResults>{"No results"}</StyledNoResults>
            )}
          </StyledTreeWrapper>
        </CustomScrollbar>
      )}

      {showCreate && (
        <EntityCreateModal
          closeModal={() => setShowCreate(false)}
          allowedEntityClasses={[EntityEnums.Class.Territory]}
          onMutationSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["tree"] })
          }
        />
      )}
      <Loader show={isFetching || updateUserMutation.isPending} />
    </>
  );
};

export const MemoizedTerritoryTreeBox = React.memo(TerritoryTreeBox);
