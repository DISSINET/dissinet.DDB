import { partitivityDict, virtualityDict } from "@shared/dictionaries";
import { IEntity, IProp } from "@shared/types";
import { excludedSuggesterEntities } from "Theme/constants";
import { AttributeIcon, Button } from "components";
import Dropdown, {
  ElvlButtonGroup,
  EntityDropzone,
  EntitySuggester,
  EntityTag,
  LogicButtonGroup,
} from "components/advanced";
import React from "react";
import { PropAttributeFilter, classesPropType } from "types";
import {
  StyledAttributesFlexColumn,
  StyledAttributesFlexRow,
  StyledTagGrid,
} from "./PropGroupRowStyles";

interface PropGroupRowType {
  prop: IProp;
  propTypeEntity?: IEntity;
  updateProp: (
    propId: string,
    changes: Partial<IProp>,
    instantUpdate?: boolean,
    languageCheck?: boolean
  ) => void;
  userCanEdit: boolean;
  isInsideTemplate: boolean;
  territoryParentId?: string;
  territoryActants: string[];
  isExpanded: boolean;
  disabledAttributes: PropAttributeFilter;
  openDetailOnCreate: boolean;
  alwaysShowCreateModal?: boolean;
  initTypeTyped?: string;
}
export const PropGroupRowType: React.FC<PropGroupRowType> = ({
  propTypeEntity,
  prop,
  updateProp,
  userCanEdit,
  isInsideTemplate,
  territoryParentId,
  territoryActants,
  isExpanded,
  disabledAttributes,
  openDetailOnCreate,
  alwaysShowCreateModal,

  initTypeTyped,
}) => {
  return (
    <StyledAttributesFlexColumn>
      <StyledTagGrid>
        {propTypeEntity ? (
          <>
            <EntityDropzone
              onSelected={(newSelectedId: string) => {
                updateProp(
                  prop.id,
                  {
                    type: {
                      ...prop.type,
                      entityId: newSelectedId,
                    },
                  },
                  true,
                  true
                );
              }}
              categoryTypes={classesPropType}
              excludedEntityClasses={excludedSuggesterEntities}
              isInsideTemplate={isInsideTemplate}
              territoryParentId={territoryParentId}
              excludedActantIds={[propTypeEntity.id]}
              disabled={!userCanEdit}
            >
              <EntityTag
                entity={propTypeEntity}
                fullWidth
                tooltipPosition="right"
                unlinkButton={
                  userCanEdit && {
                    onClick: () => {
                      updateProp(prop.id, {
                        type: {
                          ...prop.type,
                          entityId: "",
                        },
                      });
                    },
                  }
                }
                elvlButtonGroup={
                  !disabledAttributes.type?.includes("elvl") && (
                    <ElvlButtonGroup
                      value={prop.type.elvl}
                      onChange={(elvl) =>
                        updateProp(
                          prop.id,
                          {
                            type: {
                              ...prop.type,
                              elvl: elvl,
                            },
                          },
                          false,
                          false
                        )
                      }
                      disabled={!userCanEdit}
                    />
                  )
                }
              />
            </EntityDropzone>

            {prop.type.logic == "2" && (
              <Button
                key="neg"
                tooltipLabel="Negative logic"
                color="danger"
                inverted
                noBorder
                icon={<AttributeIcon attributeName="negation" />}
              />
            )}
          </>
        ) : (
          <EntitySuggester
            territoryActants={territoryActants}
            onSelected={(newSelectedId: string) => {
              updateProp(
                prop.id,
                {
                  type: {
                    ...prop.type,
                    entityId: newSelectedId,
                  },
                },
                true,
                true
              );
            }}
            placeholder="type"
            openDetailOnCreate={openDetailOnCreate}
            categoryTypes={classesPropType}
            inputWidth={80}
            excludedEntityClasses={excludedSuggesterEntities}
            isInsideTemplate={isInsideTemplate}
            territoryParentId={territoryParentId}
            disabled={!userCanEdit}
            alwaysShowCreateModal={alwaysShowCreateModal}
            initTyped={initTypeTyped}
          />
        )}
      </StyledTagGrid>
      {isExpanded && (
        <>
          <StyledAttributesFlexRow>
            {!disabledAttributes.type?.includes("logic") && (
              <LogicButtonGroup
                border
                value={prop.type.logic}
                onChange={(logic) =>
                  updateProp(prop.id, {
                    type: { ...prop.type, logic: logic },
                  })
                }
                disabled={!userCanEdit}
              />
            )}
            {!disabledAttributes.type?.includes("virtuality") && (
              <Dropdown.Single.Basic
                width={100}
                placeholder="virtuality"
                tooltipLabel="virtuality"
                icon={<AttributeIcon attributeName="virtuality" />}
                disabled={!userCanEdit}
                options={virtualityDict}
                value={prop.type.virtuality}
                onChange={(newValue) => {
                  updateProp(prop.id, {
                    type: { ...prop.type, virtuality: newValue },
                  });
                }}
              />
            )}
          </StyledAttributesFlexRow>
          <StyledAttributesFlexRow>
            {!disabledAttributes.type?.includes("partitivity") && (
              <Dropdown.Single.Basic
                width={150}
                placeholder="partitivity"
                tooltipLabel="partitivity"
                icon={<AttributeIcon attributeName="partitivity" />}
                disabled={!userCanEdit}
                options={partitivityDict}
                value={prop.type.partitivity}
                onChange={(newValue) => {
                  updateProp(prop.id, {
                    type: {
                      ...prop.type,
                      partitivity: newValue,
                    },
                  });
                }}
              />
            )}
          </StyledAttributesFlexRow>
        </>
      )}
    </StyledAttributesFlexColumn>
  );
};
