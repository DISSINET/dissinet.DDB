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
import { PropAttributeFilter, classesPropValue } from "types";
import {
  StyledAttributesFlexColumn,
  StyledAttributesFlexRow,
  StyledTagGrid,
} from "./PropGroupRowStyles";

interface PropGroupRowValue {
  propValueEntity: IEntity;
  prop: IProp;
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

  initValueTyped?: string;
}
export const PropGroupRowValue: React.FC<PropGroupRowValue> = ({
  propValueEntity,
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

  initValueTyped,
}) => {
  return (
    <StyledAttributesFlexColumn>
      <StyledTagGrid>
        {propValueEntity ? (
          <>
            <EntityDropzone
              onSelected={(newSelectedId: string) => {
                updateProp(
                  prop.id,
                  {
                    value: {
                      ...prop.value,
                      entityId: newSelectedId,
                    },
                  },
                  true,
                  true
                );
              }}
              categoryTypes={classesPropValue}
              excludedEntityClasses={excludedSuggesterEntities}
              isInsideTemplate={isInsideTemplate}
              territoryParentId={territoryParentId}
              excludedActantIds={[propValueEntity.id]}
              disabled={!userCanEdit}
            >
              <EntityTag
                entity={propValueEntity}
                fullWidth
                tooltipPosition="right"
                unlinkButton={
                  userCanEdit && {
                    onClick: () => {
                      updateProp(prop.id, {
                        value: {
                          ...prop.value,
                          entityId: "",
                        },
                      });
                    },
                  }
                }
                elvlButtonGroup={
                  !disabledAttributes.value?.includes("elvl") && (
                    <ElvlButtonGroup
                      value={prop.value.elvl}
                      onChange={(elvl) =>
                        updateProp(
                          prop.id,
                          {
                            value: {
                              ...prop.value,
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

            {prop.value.logic == "2" && (
              <Button
                key="neg"
                tooltipLabel="Negative logic"
                color="danger"
                inverted
                noBorder
                icon={<AttributeIcon attributeName={"negation"} />}
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
                  value: {
                    ...prop.value,
                    entityId: newSelectedId,
                  },
                },
                true,
                true
              );
            }}
            // autoFocus={prop.type.entityId !== ""}
            placeholder="value"
            openDetailOnCreate={openDetailOnCreate}
            categoryTypes={classesPropValue}
            inputWidth={80}
            excludedEntityClasses={excludedSuggesterEntities}
            isInsideTemplate={isInsideTemplate}
            territoryParentId={territoryParentId}
            disabled={!userCanEdit}
            alwaysShowCreateModal={alwaysShowCreateModal}
            initTyped={initValueTyped}
          />
        )}
      </StyledTagGrid>
      {isExpanded && (
        <>
          <StyledAttributesFlexRow>
            {!disabledAttributes.value?.includes("logic") && (
              <LogicButtonGroup
                border
                value={prop.value.logic}
                onChange={(logic) =>
                  updateProp(prop.id, {
                    value: {
                      ...prop.value,
                      logic: logic,
                    },
                  })
                }
                disabled={!userCanEdit}
              />
            )}
            {!disabledAttributes.value?.includes("virtuality") && (
              <Dropdown.Single.Basic
                width={100}
                placeholder="virtuality"
                tooltipLabel="virtuality"
                icon={<AttributeIcon attributeName="virtuality" />}
                disabled={!userCanEdit}
                options={virtualityDict}
                value={prop.value.virtuality}
                onChange={(newValue) => {
                  updateProp(prop.id, {
                    value: {
                      ...prop.value,
                      virtuality: newValue,
                    },
                  });
                }}
              />
            )}
          </StyledAttributesFlexRow>
          <StyledAttributesFlexRow>
            {!disabledAttributes.value?.includes("partitivity") && (
              <Dropdown.Single.Basic
                width={150}
                placeholder="partitivity"
                tooltipLabel="partitivity"
                icon={<AttributeIcon attributeName="partitivity" />}
                disabled={!userCanEdit}
                options={partitivityDict}
                value={prop.value.partitivity}
                onChange={(newValue) => {
                  updateProp(prop.id, {
                    value: {
                      ...prop.value,
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
