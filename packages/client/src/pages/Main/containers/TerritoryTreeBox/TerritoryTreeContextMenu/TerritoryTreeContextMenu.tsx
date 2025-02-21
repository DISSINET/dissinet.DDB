import { FloatingPortal, autoUpdate, useFloating } from "@floating-ui/react";
import { config, useSpring } from "@react-spring/web";
import { EntityEnums, UserEnums } from "@shared/enums";
import { IEntity, IUser } from "@shared/types";
import { UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { Button } from "components";
import React, { useEffect, useState } from "react";
import { FaPlus, FaStar, FaTrashAlt } from "react-icons/fa";
import { ContextMenuSubmitDelete } from "../ContextMenuSubmitDelete/ContextMenuSubmitDelete";
import {
  StyledCgMenuBoxed,
  StyledContextButtonGroup,
  StyledWrapper,
} from "./TerritoryTreeContextMenuStyles";
import { EntityCreateModal } from "components/advanced";

interface TerritoryTreeContextMenu {
  territoryActant: IEntity;
  right: UserEnums.RoleMode;
  empty: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  storedTerritories: string[];
  updateUserMutation: UseMutationResult<void, unknown, Partial<IUser>, unknown>;
  isFavorited?: boolean;
}
export const TerritoryTreeContextMenu: React.FC<TerritoryTreeContextMenu> = ({
  territoryActant,
  onMenuOpen,
  onMenuClose,
  right,
  empty,
  storedTerritories,
  updateUserMutation,
  isFavorited,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  const animatedMount = useSpring({
    opacity: showMenu ? 1 : 0,
    config: config.stiff,
  });

  const { refs, floatingStyles } = useFloating({
    placement: "right",
    whileElementsMounted: autoUpdate,
  });

  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    if (!showMenu && portalMounted) {
      setTimeout(() => {
        setPortalMounted(false);
      }, 300);
    }
  }, [showMenu]);

  const queryClient = useQueryClient();

  return (
    <>
      <StyledWrapper
        ref={refs.setReference}
        onMouseEnter={() => {
          onMenuOpen();
          setShowMenu(true);
          setPortalMounted(true);
        }}
        onMouseLeave={() => {
          onMenuClose();
          setShowMenu(false);
        }}
      >
        <StyledCgMenuBoxed size={18} />

        {portalMounted && (
          <FloatingPortal id="page">
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: 100,
              }}
            >
              <StyledContextButtonGroup style={animatedMount}>
                {right !== UserEnums.RoleMode.Read && (
                  <Button
                    key="add"
                    tooltipLabel="add child territory"
                    icon={<FaPlus size={14} />}
                    color="info"
                    onClick={() => {
                      // add child
                      setShowCreate(true);
                      setShowMenu(false);
                      onMenuClose();
                    }}
                  />
                )}
                <Button
                  key="favorites"
                  tooltipLabel={
                    isFavorited ? "remove from favorites" : "add to favorites"
                  }
                  icon={<FaStar size={14} />}
                  color={isFavorited ? "grey" : "warning"}
                  onClick={() => {
                    if (isFavorited) {
                      // remove from favorites
                      const index = storedTerritories.indexOf(
                        territoryActant.id
                      );
                      if (index > -1) {
                        storedTerritories.splice(index, 1).slice;
                      }
                      const newStored = [
                        ...storedTerritories.map((storedTerritory) => ({
                          territoryId: storedTerritory,
                        })),
                      ];
                      updateUserMutation.mutate({
                        storedTerritories: newStored,
                      });
                    } else {
                      // add to favorites
                      const newStored = [
                        ...storedTerritories.map((storedTerritory) => ({
                          territoryId: storedTerritory,
                        })),
                        { territoryId: territoryActant.id },
                      ];
                      updateUserMutation.mutate({
                        storedTerritories: newStored,
                      });
                    }
                    setShowMenu(false);
                    onMenuClose();
                  }}
                />
                {((right === UserEnums.RoleMode.Admin && empty) ||
                  (right === UserEnums.RoleMode.Write && empty)) && (
                  <Button
                    key="delete"
                    tooltipLabel="delete territory"
                    icon={<FaTrashAlt size={14} />}
                    color="danger"
                    onClick={() => {
                      setShowSubmit(true);
                      setShowMenu(false);
                      onMenuClose();
                    }}
                  />
                )}
              </StyledContextButtonGroup>
            </div>
          </FloatingPortal>
        )}
      </StyledWrapper>

      {showSubmit && (
        <ContextMenuSubmitDelete
          onClose={() => setShowSubmit(false)}
          territoryActant={territoryActant}
        />
      )}
      {showCreate && (
        <EntityCreateModal
          closeModal={() => setShowCreate(false)}
          allowedEntityClasses={[EntityEnums.Class.Territory]}
          onMutationSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["tree"] })
          }
          parentTerritory={territoryActant}
        />
      )}
    </>
  );
};
