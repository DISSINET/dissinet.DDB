import {
  entitiesDict,
  entityStatusDict,
  languageDict,
} from "@shared/dictionaries";
import { classesAll } from "@shared/dictionaries/entity";
import { EntityEnums } from "@shared/enums";
import { IEntity } from "@shared/types";
import {
  EProtocolTieType,
  ITerritoryValidation,
} from "@shared/types/territory";
import { Button, Input } from "components";
import Dropdown, {
  AttributeButtonGroup,
  EntitySuggester,
  EntityTag,
} from "components/advanced";
import React, { useMemo } from "react";
import { FaTrashAlt } from "react-icons/fa";
import {
  StyledBorderLeft,
  StyledFlexList,
  StyledGrid,
  StyledLabel,
  StyledLanguageList,
  StyledNotActiveTag,
} from "./ValidationRuleStyles";
import { ValidationText } from "./ValidationText/ValidationText";
import { LanguageTag } from "./LanguageTag";

interface ValidationRule {
  validation: ITerritoryValidation;
  entities: Record<string, IEntity>;
  updateValidationRule: (changes: Partial<ITerritoryValidation>) => void;
  removeValidationRule: () => void;
  isInsideTemplate: boolean;
  territoryParentId?: string;
  userCanEdit: boolean;
}
export const ValidationRule: React.FC<ValidationRule> = ({
  validation,
  entities,
  updateValidationRule,
  removeValidationRule,
  isInsideTemplate,
  territoryParentId,
  userCanEdit,
}) => {
  const {
    detail,
    entityClasses,
    entityClassifications,
    entityLanguages,
    entityStatuses,
    tieType,
    propType,
    allowedClasses,
    allowedEntities,
  } = validation;

  const disabledEntityClassesSection = useMemo<boolean>(() => {
    return allowedEntities !== undefined && allowedEntities.length > 0;
  }, [allowedEntities]);

  const allowedEntitiesClasses = useMemo<EntityEnums.Class[]>(() => {
    if (tieType === EProtocolTieType.Classification) {
      return [EntityEnums.Class.Concept];
    }
    if (tieType === EProtocolTieType.Reference) {
      return [EntityEnums.Class.Resource];
    }
    return classesAll;
  }, [tieType]);

  const active: boolean = useMemo<boolean>(() => {
    return validation.active !== false;
  }, [validation.active]);

  const isAllowedEntitiesSuggesterVisible = useMemo<boolean>(() => {
    if (!userCanEdit) {
      return false;
    }

    if (!allowedEntities) {
      return false;
    }

    if (tieType === EProtocolTieType.Reference) {
      // we do not want to allow multiple resources
      // should be fixed in the future by introducing logic
      return allowedEntities?.length !== 1;
    } else {
      return true;
    }
  }, [tieType, allowedEntities, userCanEdit]);

  return (
    <StyledBorderLeft $active={active}>
      <div
        style={{
          width: "100%",
          paddingTop: "0.2rem",
          paddingBottom: "1.5rem",
        }}
      >
        {!active && <StyledNotActiveTag>rule not activated</StyledNotActiveTag>}
        <ValidationText
          validation={validation}
          entities={entities}
          active={active}
        />
      </div>
      <StyledGrid>
        {/* Entity classes */}
        <StyledLabel>Entity types</StyledLabel>
        <Dropdown.Multi.Entity
          disableEmpty
          width="full"
          value={entityClasses ?? []}
          onChange={(values) => updateValidationRule({ entityClasses: values })}
          options={entitiesDict}
          disabled={!userCanEdit}
        />

        {/* Entity Classifications */}
        <StyledLabel>classified as</StyledLabel>
        <StyledFlexList>
          {entityClassifications?.map((classification, key) => (
            <EntityTag
              key={key}
              flexListMargin
              entity={entities[classification]}
              unlinkButton={
                userCanEdit && {
                  onClick: () =>
                    updateValidationRule({
                      entityClassifications: entityClassifications.filter(
                        (c) => c !== classification
                      ),
                    }),
                }
              }
            />
          ))}
          {!(
            !userCanEdit &&
            entityClassifications &&
            entityClassifications?.length > 0
          ) && (
            <EntitySuggester
              alwaysShowCreateModal
              excludedActantIds={entityClassifications}
              categoryTypes={[EntityEnums.Class.Concept]}
              onPicked={(entity) =>
                updateValidationRule({
                  entityClassifications: [
                    ...(entityClassifications ?? []),
                    entity.id,
                  ],
                })
              }
              disabled={
                !userCanEdit || tieType === EProtocolTieType.Classification
              }
            />
          )}
        </StyledFlexList>

        {/* Entity Languages */}
        <StyledLabel>having language</StyledLabel>
        <StyledFlexList>
          <StyledLanguageList>
            {entityLanguages?.map((language, key) => (
              <LanguageTag
                languageValue={language}
                languageTooltip={
                  languageDict.find((lang) => lang.value === language)?.label
                }
                onUnlink={
                  userCanEdit
                    ? () => {
                        updateValidationRule({
                          entityLanguages: entityLanguages.filter(
                            (c) => c !== language
                          ),
                        });
                      }
                    : undefined
                }
              />
            ))}
          </StyledLanguageList>

          {!(!userCanEdit && entityLanguages) && (
            <Dropdown.Single.Basic
              disabled={!userCanEdit}
              placeholder="Add new rule language"
              width={200}
              options={languageDict.filter(
                (language) =>
                  !entityLanguages || !entityLanguages.includes(language.value)
              )}
              value={null}
              onChange={(selectedOption) => {
                const newLanguageList = [...(entityLanguages ?? [])];
                const newLanguage = selectedOption as EntityEnums.Language;

                updateValidationRule({
                  entityLanguages: newLanguageList.includes(newLanguage)
                    ? newLanguageList.filter(
                        (language) => language !== newLanguage
                      )
                    : [...newLanguageList, newLanguage],
                });
              }}
            />
          )}
        </StyledFlexList>

        {/* Entity Statuses */}
        <StyledLabel>having status</StyledLabel>
        <StyledFlexList>
          <AttributeButtonGroup
            noMargin
            disabled={!userCanEdit}
            canSelectMultiple={true}
            options={entityStatusDict.map((entityStatusOption) => {
              return {
                longValue: entityStatusOption["label"],
                shortValue: entityStatusOption["label"],

                onClick: () => {
                  let newStatus: EntityEnums.Status[] = [
                    ...(entityStatuses ?? []),
                  ];
                  const statusValue = entityStatusOption[
                    "value"
                  ] as EntityEnums.Status;

                  console.log("statusValue", statusValue);

                  if (entityStatuses && entityStatuses.length > 0) {
                    // remove if already in the list
                    if (entityStatuses.includes(statusValue)) {
                      newStatus = entityStatuses.filter(
                        (status) => status !== statusValue
                      );
                    } else {
                      newStatus.push(statusValue);
                    }
                  } else {
                    newStatus.push(statusValue);
                  }

                  updateValidationRule({ entityStatuses: newStatus });
                },
                selected:
                  entityStatuses && entityStatuses.length
                    ? entityStatuses.includes(
                        entityStatusOption["value"] as EntityEnums.Status
                      )
                    : true,
              };
            })}
          />
        </StyledFlexList>

        {/* Tie type */}
        <StyledLabel>Tie type</StyledLabel>
        <AttributeButtonGroup
          disabled={!userCanEdit}
          noMargin
          options={[
            {
              longValue: EProtocolTieType.Property,
              shortValue: EProtocolTieType.Property,
              onClick: () =>
                updateValidationRule({
                  tieType: EProtocolTieType.Property,
                  propType: [],
                  allowedClasses: [],
                  allowedEntities: [],
                }),
              selected: tieType === EProtocolTieType.Property,
            },
            {
              longValue: EProtocolTieType.Classification,
              shortValue: EProtocolTieType.Classification,
              onClick: () =>
                updateValidationRule({
                  tieType: EProtocolTieType.Classification,
                  propType: [],
                  allowedClasses: [],
                  allowedEntities: [],
                }),
              selected: tieType === EProtocolTieType.Classification,
              optionDisabled:
                entityClassifications && entityClassifications.length > 0,
            },
            {
              longValue: EProtocolTieType.Reference,
              shortValue: EProtocolTieType.Reference,
              onClick: () =>
                updateValidationRule({
                  tieType: EProtocolTieType.Reference,
                  propType: [],
                  allowedClasses: [],
                  allowedEntities: [],
                }),
              selected: tieType === EProtocolTieType.Reference,
            },
          ]}
        />

        {/* Prop type */}
        {tieType === EProtocolTieType.Property && (
          <>
            <StyledLabel>Prop type</StyledLabel>
            <StyledFlexList>
              {propType?.map((entityId, key) => (
                <EntityTag
                  key={key}
                  flexListMargin
                  entity={entities[entityId]}
                  unlinkButton={
                    userCanEdit && {
                      onClick: () =>
                        updateValidationRule({
                          propType: propType?.filter(
                            (pTiD) => pTiD !== entityId
                          ),
                        }),
                    }
                  }
                />
              ))}
              {!(!userCanEdit && propType && propType.length > 0) && (
                <EntitySuggester
                  alwaysShowCreateModal
                  categoryTypes={[EntityEnums.Class.Concept]}
                  excludedActantIds={propType}
                  onPicked={(entity) =>
                    updateValidationRule({
                      propType: [...(propType || []), entity.id],
                    })
                  }
                  disabled={!userCanEdit}
                />
              )}
            </StyledFlexList>
          </>
        )}

        {/* Allowed classes */}
        {tieType === EProtocolTieType.Property && (
          <>
            <StyledLabel>Allowed E types</StyledLabel>
            <Dropdown.Multi.Entity
              disableEmpty
              width="full"
              value={allowedClasses || []}
              onChange={(values) =>
                updateValidationRule({ allowedClasses: values })
              }
              options={entitiesDict}
              disabled={disabledEntityClassesSection || !userCanEdit}
            />
          </>
        )}

        {/* Allowed entities */}
        <StyledLabel>
          {tieType === EProtocolTieType.Classification && "Allowed Concepts"}
          {tieType === EProtocolTieType.Reference && "Allowed Resources"}
          {tieType === EProtocolTieType.Property && "Allowed E values"}
        </StyledLabel>
        <StyledFlexList>
          {allowedEntities?.map((entityId, key) => (
            <EntityTag
              key={key}
              flexListMargin
              entity={entities[entityId]}
              unlinkButton={
                userCanEdit && {
                  onClick: () =>
                    updateValidationRule({
                      allowedEntities: allowedEntities.filter(
                        (aE) => aE !== entityId
                      ),
                    }),
                }
              }
            />
          ))}

          {isAllowedEntitiesSuggesterVisible && (
            <EntitySuggester
              alwaysShowCreateModal
              categoryTypes={allowedEntitiesClasses}
              excludedActantIds={allowedEntities}
              onPicked={(entity) => {
                updateValidationRule({
                  allowedEntities: [...(allowedEntities ?? []), entity.id],
                  allowedClasses: [],
                });
              }}
              isInsideTemplate={isInsideTemplate}
              territoryParentId={territoryParentId}
              disabled={!userCanEdit}
            />
          )}
        </StyledFlexList>

        {/* Detail */}
        <StyledLabel>Detail / Notes</StyledLabel>
        <Input
          width="full"
          value={detail}
          onChangeFn={(value) => updateValidationRule({ detail: value })}
          disabled={!userCanEdit}
        />
      </StyledGrid>
      {userCanEdit && (
        <div
          style={{
            paddingTop: "1.5rem",
            paddingBottom: ".5rem",
            display: "flex",
            gap: "1rem",
            alignItems: "center",
          }}
        >
          <Button
            color={active ? "greyer" : "primary"}
            onClick={() => updateValidationRule({ active: !active })}
            inverted
            label={active ? "deactivate rule" : "activate rule"}
          />
          <Button
            color="danger"
            icon={<FaTrashAlt />}
            onClick={removeValidationRule}
            inverted
            label="remove validation rule"
          />
        </div>
      )}
    </StyledBorderLeft>
  );
};
