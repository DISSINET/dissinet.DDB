import React from "react";
import { StyledGridValue } from "./EntityReferenceTableStyles";
import { EntityEnums } from "@shared/enums";
import {
  EntityDropzone,
  EntityTag,
  EntitySuggester,
} from "components/advanced";
import { IEntity, IReference } from "@shared/types";

interface EntityReferenceTableResource {
  reference: IReference;
  resourceEntity?: IEntity;
  handleChangeResource: (
    refId: string,
    newReSourceId: string,
    instantUpdate?: boolean
  ) => void;
  isInsideTemplate?: boolean;
  territoryParentId?: string;
  alwaysShowCreateModal?: boolean;
  openDetailOnCreate?: boolean;

  initResourceTyped?: string;

  disabled?: boolean;
}
export const EntityReferenceTableResource: React.FC<
  EntityReferenceTableResource
> = ({
  reference,
  resourceEntity,
  handleChangeResource,
  isInsideTemplate,
  territoryParentId,
  alwaysShowCreateModal,
  openDetailOnCreate,

  initResourceTyped,

  disabled,
}) => {
  return (
    <StyledGridValue>
      {resourceEntity ? (
        <EntityDropzone
          onSelected={(newSelectedId: string) => {
            handleChangeResource(reference.id, newSelectedId, true);
          }}
          disableTemplatesAccept
          categoryTypes={[EntityEnums.Class.Resource]}
          isInsideTemplate={isInsideTemplate}
          territoryParentId={territoryParentId}
          excludedActantIds={[resourceEntity.id]}
          disabled={disabled}
        >
          <>
            <EntityTag
              entity={resourceEntity}
              fullWidth
              unlinkButton={
                !disabled && {
                  onClick: () => {
                    handleChangeResource(reference.id, "");
                  },
                  tooltipLabel: "unlink resource",
                }
              }
            />
          </>
        </EntityDropzone>
      ) : (
        <EntitySuggester
          alwaysShowCreateModal={alwaysShowCreateModal}
          openDetailOnCreate={openDetailOnCreate}
          territoryActants={[]}
          onSelected={(newSelectedId) => {
            handleChangeResource(reference.id, newSelectedId, true);
          }}
          disableTemplatesAccept
          categoryTypes={[EntityEnums.Class.Resource]}
          isInsideTemplate={isInsideTemplate}
          territoryParentId={territoryParentId}
          disabled={disabled}
          initTyped={initResourceTyped}
        />
      )}
    </StyledGridValue>
  );
};
