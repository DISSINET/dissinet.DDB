import { UserEnums } from "@shared/enums";
import api from "api";
import { Button, ButtonGroup, Loader } from "components";
import { useSearchParams } from "hooks";
import React, { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { setSelectedTerritoryPath } from "redux/features/territoryTree/selectedTerritoryPathSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { rootTerritoryId } from "Theme/constants";
import { searchTree } from "utils";
import { ContextMenuNewTerritoryModal } from "./ContextMenuNewTerritoryModal/ContextMenuNewTerritoryModal";
import { StyledTreeWrapper } from "./TerritoryTreeBoxStyles";
import { TerritoryTreeNode } from "./TerritoryTreeNode/TerritoryTreeNode";
import { IResponseTree } from "@shared/types";
import { TerritoryTreeFilter } from "./TerritoryTreeFilter/TerritoryTreeFilter";
import { BsFilter } from "react-icons/bs";
import { ITerritoryFilter } from "types";
import { setTreeInitialized } from "redux/features/territoryTree/treeInitializeSlice";

const initFilterSettings: ITerritoryFilter = {
  nonEmpty: false,
  starred: false,
  editorRights: false,
  filter: "",
};
export const TerritoryTreeBox: React.FC = () => {
  const queryClient = useQueryClient();

  const {
    status,
    data: treeData,
    error,
    isFetching,
  } = useQuery(
    ["tree"],
    async () => {
      const res = await api.treeGet();
      return res.data;
    },
    { enabled: api.isLoggedIn() }
  );
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

  const updateUserMutation = useMutation(
    async (changes: object) => {
      if (userId) {
        await api.usersUpdate(userId, changes);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["tree"]);
        queryClient.invalidateQueries(["user"]);
      },
    }
  );

  const userRole = localStorage.getItem("userrole");
  const { territoryId } = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);

  const dispatch = useAppDispatch();
  const selectedTerritoryPath = useAppSelector(
    (state) => state.territoryTree.selectedTerritoryPath
  );

  function filterTreeNonEmpty(root: IResponseTree): IResponseTree | null {
    if (root.empty === true) {
      return null; // Exclude nodes with empty = true
    }

    const filteredChildren = root.children
      .map((child) => filterTreeNonEmpty(child))
      .filter((filteredChild) => filteredChild !== null) as IResponseTree[];

    return { ...root, children: filteredChildren };
  }

  function filterTreeWithWriteRights(
    root: IResponseTree | null
  ): IResponseTree | null {
    if (!root) {
      return null;
    }

    const hasWriteDescendant = root.children.some((child) =>
      hasWriteRightRecursively(child)
    );

    if (root.right === UserEnums.RoleMode.Write || hasWriteDescendant) {
      const filteredChildren = root.children
        .map((child) => filterTreeWithWriteRights(child))
        .filter((filteredChild) => filteredChild !== null);

      return { ...root, children: filteredChildren } as IResponseTree;
    }

    return null;
  }

  function hasWriteRightRecursively(node: IResponseTree | null): boolean {
    if (!node) {
      return false;
    }

    if (node.right === UserEnums.RoleMode.Write) {
      return true;
    }

    return node.children.some((child) => hasWriteRightRecursively(child));
  }

  const [filterSettings, setFilterSettings] =
    useState<ITerritoryFilter>(initFilterSettings);
  const [filteredTreeData, setFilteredTreeData] =
    useState<IResponseTree | null>();

  useEffect(() => {
    if (treeData) {
      setFilteredTreeData(treeData);
    }
  }, [treeData]);

  const handleFilterChange = (
    key: keyof ITerritoryFilter,
    value: boolean | string
  ) => {
    setFilterSettings({ ...filterSettings, [key]: value });

    switch (key) {
      case "nonEmpty":
        if (value === true) {
          treeData && setFilteredTreeData(filterTreeNonEmpty(treeData));
        } else {
          setFilteredTreeData(treeData);
        }
        return;
      case "editorRights":
        if (value === true) {
          treeData && setFilteredTreeData(filterTreeWithWriteRights(treeData));
        } else {
          setFilteredTreeData(treeData);
        }
        return;
      default:
        setFilteredTreeData(treeData);
        return;
    }
  };

  useEffect(() => {
    if (treeData) {
      const foundTerritory = searchTree(treeData, territoryId);
      if (foundTerritory) {
        dispatch(setSelectedTerritoryPath(foundTerritory.path));
      }
    }
  }, [treeData, territoryId]);

  const [filterIsOpen, setFilterIsOpen] = useState(true);

  return (
    <>
      {userRole === UserEnums.RoleMode.Admin && (
        <ButtonGroup>
          <Button
            label="new territory"
            icon={<FaPlus />}
            onClick={() => setShowCreate(true)}
            fullWidth
          />
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              onClick={() => setFilterIsOpen(!filterIsOpen)}
              color="info"
              inverted={!filterIsOpen}
              fullWidth
              icon={<BsFilter />}
            />
          </div>
        </ButtonGroup>
      )}

      {filterIsOpen && (
        <TerritoryTreeFilter
          filterData={filterSettings}
          handleFilterChange={(key, value) => handleFilterChange(key, value)}
          userRole={userRole}
        />
      )}

      <StyledTreeWrapper id="Territories-box-content">
        {filteredTreeData && (
          <TerritoryTreeNode
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
      </StyledTreeWrapper>

      {showCreate && (
        <ContextMenuNewTerritoryModal
          onClose={() => setShowCreate(false)}
          territoryActantId={rootTerritoryId}
        />
      )}
      <Loader show={isFetching || updateUserMutation.isLoading} />
    </>
  );
};

export const MemoizedTerritoryTreeBox = React.memo(TerritoryTreeBox);
