import { EntityEnums } from "@shared/enums";
import { IEntity, IResponseDetail, IResponseGeneric } from "@shared/types";
import { ITerritoryData, ITerritoryProtocol } from "@shared/types/territory";
import { UseMutationResult } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { Input } from "components";
import { EntitySuggester, EntityTag } from "components/advanced";
import React, { useEffect } from "react";
import { StyledSuggesterWrapper } from "../EntityDetailRelations/EntityDetailRelationTypeBlock/EntityDetailRelationTypeBlockStyles";
import {
  StyledGrid,
  StyledLabel,
  StyledTagWrap,
  StyledValue,
} from "./EntityDetailProtocolStyles";
import { StyledFlexList } from "../../../../../../components/advanced/ValidationRule/ValidationRuleStyles";

const initialProtocol: ITerritoryProtocol = {
  project: "",
  dataCollectionMethods: [],
  description: "",
  guidelines: [],
  detailedProtocols: [],
  startDate: "",
  endDate: "",
  relatedDataPublications: [],
};

interface EntityDetailProtocol {
  territory: IResponseDetail;
  updateEntityMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric<any>, any>,
    Error,
    Partial<IEntity>,
    unknown
  >;
  isInsideTemplate: boolean;
  userCanEdit: boolean;
}
export const EntityDetailProtocol: React.FC<EntityDetailProtocol> = ({
  territory,
  updateEntityMutation,
  isInsideTemplate,
  userCanEdit,
}) => {
  const { entities } = territory;
  const { protocol } = territory.data as ITerritoryData;

  useEffect(() => {
    // TODO: discover which attributes are missing and init them
    if (!protocol || (protocol && Object.entries(protocol).length === 0)) {
      updateEntityMutation.mutate({
        data: {
          protocol: initialProtocol,
        },
      });
    }
  }, []);

  // TODO: maybe move whole check and protocol init one component up?
  if (!protocol) {
    return;
  }
  const {
    project,
    dataCollectionMethods = [],
    description,
    guidelines = [],
    detailedProtocols = [],
    startDate,
    endDate,
    relatedDataPublications = [],
  } = protocol;

  const updateProtocol = (changes: Partial<ITerritoryProtocol>) => {
    updateEntityMutation.mutate({ data: { protocol: changes } });
  };

  return (
    <StyledGrid>
      <StyledLabel>Project</StyledLabel>
      <StyledValue>
        <Input
          width="full"
          value={project}
          onChangeFn={(text) => updateProtocol({ project: text })}
          disabled={!userCanEdit}
        />
      </StyledValue>

      <StyledLabel>Data collection method</StyledLabel>
      <StyledValue>
        <StyledFlexList>
          {Array.isArray(dataCollectionMethods) &&
            dataCollectionMethods?.map((conceptId) => {
              return (
                <StyledTagWrap key={conceptId}>
                  <EntityTag
                    flexListMargin
                    entity={entities[conceptId]}
                    unlinkButton={
                      userCanEdit && {
                        onClick: () =>
                          updateProtocol({
                            dataCollectionMethods: dataCollectionMethods.filter(
                              (id) => id !== conceptId
                            ),
                          }),
                      }
                    }
                  />
                </StyledTagWrap>
              );
            })}
          {userCanEdit && (
            <EntitySuggester
              inputWidth="full"
              alwaysShowCreateModal
              onPicked={(newPicked) => {
                updateProtocol({
                  dataCollectionMethods: [
                    ...dataCollectionMethods,
                    newPicked.id,
                  ],
                });
              }}
              excludedActantIds={dataCollectionMethods}
              categoryTypes={[EntityEnums.Class.Concept]}
              territoryParentId={territory.data.parent.territoryId}
              isInsideTemplate={isInsideTemplate}
              disabled={!userCanEdit}
            />
          )}
        </StyledFlexList>
      </StyledValue>

      <StyledLabel>Description</StyledLabel>
      <StyledValue>
        <Input
          width="full"
          type="textarea"
          rows={3}
          value={description}
          onChangeFn={(text) => updateProtocol({ description: text })}
          disabled={!userCanEdit}
        />
      </StyledValue>

      <StyledLabel>Guidelines</StyledLabel>
      <StyledValue>
        <StyledFlexList>
          {Array.isArray(guidelines) &&
            guidelines.map((guidelineR) => {
              return (
                <StyledTagWrap key={guidelineR}>
                  <EntityTag
                    flexListMargin
                    entity={entities[guidelineR]}
                    unlinkButton={
                      userCanEdit && {
                        onClick: () =>
                          updateProtocol({
                            guidelines: guidelines.filter(
                              (id) => id !== guidelineR
                            ),
                          }),
                      }
                    }
                  />
                </StyledTagWrap>
              );
            })}
          {userCanEdit && (
            <EntitySuggester
              inputWidth="full"
              alwaysShowCreateModal
              onPicked={(newPicked) => {
                updateProtocol({
                  guidelines: [...guidelines, newPicked.id],
                });
              }}
              excludedActantIds={guidelines}
              categoryTypes={[EntityEnums.Class.Resource]}
              territoryParentId={territory.data.parent.territoryId}
              isInsideTemplate={isInsideTemplate}
              disabled={!userCanEdit}
            />
          )}
        </StyledFlexList>
      </StyledValue>

      <StyledLabel>Detailed protocol</StyledLabel>
      <StyledValue>
        <StyledFlexList>
          {Array.isArray(detailedProtocols) &&
            detailedProtocols.map((resourceId) => {
              return (
                <StyledTagWrap key={resourceId}>
                  <EntityTag
                    flexListMargin
                    entity={entities[resourceId]}
                    unlinkButton={
                      userCanEdit && {
                        onClick: () =>
                          updateProtocol({
                            detailedProtocols: detailedProtocols.filter(
                              (id) => id !== resourceId
                            ),
                          }),
                      }
                    }
                  />
                </StyledTagWrap>
              );
            })}
          {userCanEdit && (
            <EntitySuggester
              inputWidth="full"
              alwaysShowCreateModal
              onPicked={(newPicked) => {
                updateProtocol({
                  detailedProtocols: [...detailedProtocols, newPicked.id],
                });
              }}
              excludedActantIds={detailedProtocols}
              categoryTypes={[EntityEnums.Class.Resource]}
              territoryParentId={territory.data.parent.territoryId}
              isInsideTemplate={isInsideTemplate}
              disabled={!userCanEdit}
            />
          )}
        </StyledFlexList>
      </StyledValue>

      <StyledLabel>Start date</StyledLabel>
      <StyledValue>
        {startDate.length > 0 ? (
          <StyledTagWrap>
            <EntityTag
              entity={entities[startDate]}
              unlinkButton={
                userCanEdit && {
                  onClick: () => updateProtocol({ startDate: "" }),
                }
              }
            />
          </StyledTagWrap>
        ) : (
          <EntitySuggester
            inputWidth="full"
            alwaysShowCreateModal
            onPicked={(newPicked) => {
              updateProtocol({ startDate: newPicked.id });
            }}
            categoryTypes={[EntityEnums.Class.Value]}
            territoryParentId={territory.data.parent.territoryId}
            isInsideTemplate={isInsideTemplate}
            disabled={!userCanEdit}
          />
        )}
      </StyledValue>

      <StyledLabel>End date</StyledLabel>
      <StyledValue>
        {endDate.length > 0 ? (
          <StyledTagWrap>
            <EntityTag
              entity={entities[endDate]}
              unlinkButton={
                userCanEdit && {
                  onClick: () => updateProtocol({ endDate: "" }),
                }
              }
            />
          </StyledTagWrap>
        ) : (
          <EntitySuggester
            inputWidth="full"
            alwaysShowCreateModal
            onPicked={(newPicked) => {
              updateProtocol({ endDate: newPicked.id });
            }}
            categoryTypes={[EntityEnums.Class.Value]}
            territoryParentId={territory.data.parent.territoryId}
            isInsideTemplate={isInsideTemplate}
            disabled={!userCanEdit}
          />
        )}
      </StyledValue>

      <StyledLabel>Related data publications</StyledLabel>
      <StyledValue>
        <StyledFlexList>
          {Array.isArray(relatedDataPublications) &&
            relatedDataPublications.map((resourceId) => {
              return (
                <StyledTagWrap key={resourceId}>
                  <EntityTag
                    flexListMargin
                    entity={entities[resourceId]}
                    unlinkButton={
                      userCanEdit && {
                        onClick: () =>
                          updateProtocol({
                            relatedDataPublications:
                              relatedDataPublications.filter(
                                (id) => id !== resourceId
                              ),
                          }),
                      }
                    }
                  />
                </StyledTagWrap>
              );
            })}
          {userCanEdit && (
            <EntitySuggester
              inputWidth="full"
              alwaysShowCreateModal
              onPicked={(newPicked) => {
                updateProtocol({
                  relatedDataPublications: [
                    ...relatedDataPublications,
                    newPicked.id,
                  ],
                });
              }}
              excludedActantIds={relatedDataPublications}
              categoryTypes={[EntityEnums.Class.Resource]}
              territoryParentId={territory.data.parent.territoryId}
              isInsideTemplate={isInsideTemplate}
              disabled={!userCanEdit}
            />
          )}
        </StyledFlexList>
      </StyledValue>
    </StyledGrid>
  );
};
