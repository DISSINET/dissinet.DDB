import { entitiesDict } from "@shared/dictionaries";
import { EntityEnums, RelationEnums } from "@shared/enums";
import {
  IEntity,
  IResponseDetail,
  IResponseGeneric,
  Relation,
} from "@shared/types";
import { UseMutationResult, useQuery } from "@tanstack/react-query";
import { excludedSuggesterEntities } from "Theme/constants";
import api from "api";
import { AxiosResponse } from "axios";
import { EntitySuggester } from "components/advanced";
import update from "immutability-helper";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { EntityDetailCloudRelation } from "./EntityDetailCloudRelation/EntityDetailCloudRelation";
import { EntityDetailRelationGraph } from "./EntityDetailGraph/EntityDetailGraph";
import { EntityDetailRelationRow } from "./EntityDetailRelationRow/EntityDetailRelationRow";
import {
  StyledLabelSuggester,
  StyledRelationBlock,
  StyledRelationValues,
  StyledSuggesterWrapper,
} from "./EntityDetailRelationTypeBlockStyles";
import { EntityDetailRelationTypeIcon } from "./EntityDetailRelationTypeIcon/EntityDetailRelationTypeIcon";

// relations for one type
interface EntityDetailRelationTypeBlock {
  selectedRelations?: Relation.IRelation[];
  relationType: RelationEnums.Type;
  entities: Record<string, IEntity>;
  relationCreateMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    Relation.IRelation,
    unknown
  >;
  relationUpdateMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    {
      relationId: string;
      changes: Partial<Relation.IRelation>;
    },
    unknown
  >;
  relationDeleteMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    string,
    unknown
  >;
  entity: IResponseDetail;
  userCanEdit: boolean;
}
export const EntityDetailRelationTypeBlock: React.FC<
  EntityDetailRelationTypeBlock
> = ({
  selectedRelations = [],
  relationType,
  entities,
  relationCreateMutation,
  relationUpdateMutation,
  relationDeleteMutation,
  entity,
  userCanEdit,
}) => {
  const relationRule = Relation.RelationRules[relationType]!;
  const {
    cloudType: isCloudType,
    multiple: isMultiple,
    order: hasOrder,
  } = relationRule;

  const [graphOpen, setGraphOpen] = useState<boolean>(false);

  const handleOpenGraph = () => {
    setGraphOpen(!graphOpen);
  };

  // For suggester
  const getCategoryTypes = (): EntityEnums.Class[] => {
    const entitiesPattern = relationRule.allowedEntitiesPattern;

    if (entitiesPattern.length > 0) {
      if (isCloudType) {
        return [entity.class];
      } else {
        const pairs = entitiesPattern.filter(
          (array) => array[0] === entity.class
        );
        if (pairs.length > 0) {
          return [...new Set(pairs.map((pair) => pair[1]))];
        }
      }
    } else {
      // Multiple - all entities
      if (!relationRule.disabledEntities?.length) {
        return entitiesDict.map((e) => e.value);
      } else {
        return entitiesDict
          .filter((e) => !relationRule.disabledEntities?.includes(e.value))
          .map((e) => e.value);
      }
    }
    return [];
  };

  const handleMultiSelected = (selectedId: string) => {
    if (relationType === RelationEnums.Type.Identification) {
      const newRelation: Relation.IIdentification = {
        id: uuidv4(),
        entityIds: [entity.id, selectedId],
        type: RelationEnums.Type.Identification,
        certainty: EntityEnums.Certainty.Certain,
      };
      relationCreateMutation.mutate(newRelation);
    } else {
      const newRelation: Relation.IRelation = {
        id: uuidv4(),
        entityIds: [entity.id, selectedId],
        type: relationType,
      };
      relationCreateMutation.mutate(newRelation);
    }
  };

  const [usedEntityIds, setUsedEntityIds] = useState<string[]>([]);

  useEffect(() => {
    const entityIds = selectedRelations
      .map((relation) => relation.entityIds.map((entityId) => entityId))
      .flat(1);
    if (!relationRule.selfLoop) {
      entityIds.push(entity.id);
    }
    setUsedEntityIds([...new Set(entityIds)]);
  }, [selectedRelations, relationRule]);

  const [tempCloudEntityId, setTempCloudEntityId] = useState<string | false>(
    false
  );
  const {} = useQuery({
    queryKey: ["relation-entity-temp", tempCloudEntityId],
    queryFn: async () => {
      if (tempCloudEntityId) {
        const res = await api.detailGet(tempCloudEntityId);
        if (res.data) {
          addToCloud(res.data);
          setTempCloudEntityId(false);
        }
        return res.data;
      }
    },
    enabled: api.isLoggedIn() && !!tempCloudEntityId,
  });
  const addToCloud = (cloudEntity: IResponseDetail) => {
    const selectedEntityRelation =
      cloudEntity.relations[relationType]?.connections;

    if (selectedEntityRelation?.length) {
      // update existing relation
      const changes = {
        entityIds: [...selectedEntityRelation[0].entityIds, entity.id],
      };
      relationUpdateMutation.mutate({
        relationId: selectedEntityRelation[0].id,
        changes: changes,
      });
    } else {
      // Create new relation (cloud init)
      const newRelation: Relation.IRelation = {
        id: uuidv4(),
        entityIds: [entity.id, cloudEntity.id],
        type: relationType as RelationEnums.Type,
      };
      relationCreateMutation.mutate(newRelation);
    }
  };

  useEffect(() => {
    const uniqueRelationIds: string[] = [];

    const uniqueRelations = selectedRelations.filter((r) => {
      if (uniqueRelationIds.includes(r.id)) {
        return false;
      } else {
        uniqueRelationIds.push(r.id);
        return true;
      }
    });

    setCurrentRelations([...new Set(uniqueRelations)]);
  }, [selectedRelations]);

  const [currentRelations, setCurrentRelations] = useState<
    Relation.IRelation[]
  >([]);

  const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
    setCurrentRelations((prevRelations) =>
      update(prevRelations, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, prevRelations[dragIndex]],
        ],
      })
    );
  }, []);

  const updateOrderFn = (relationId: string, newOrder: number) => {
    let allOrders: number[] = selectedRelations.map((relation, key) =>
      relation.order !== undefined ? relation.order : 0
    );
    let finalOrder: number = 0;

    const currentRelation = selectedRelations.find(
      (relation) => relation.id === relationId
    );

    if (newOrder === 0) {
      finalOrder = allOrders[0] - 1;
    } else if (newOrder === selectedRelations.length - 1) {
      finalOrder = allOrders[newOrder - 1] + 1;
    } else {
      if (currentRelation?.order === allOrders[newOrder - 1]) {
        finalOrder = allOrders[newOrder];
      } else {
        finalOrder = allOrders[newOrder - 1];
      }
    }
    relationUpdateMutation.mutate({
      relationId: relationId,
      changes: { order: finalOrder },
    });
  };

  const hasSuggester = useMemo(() => {
    if (!userCanEdit && selectedRelations.length > 0) {
      return false;
    }
    if (isCloudType) {
      return true;
    }
    return isMultiple || selectedRelations.length < 1;
  }, [selectedRelations, userCanEdit]);

  return (
    <StyledRelationBlock>
      {/* Type column */}

      {/* Label & Suggester column */}
      <div>
        <EntityDetailRelationTypeIcon
          relationType={relationType}
          graphOpen={graphOpen}
          handleOpenGraph={handleOpenGraph}
        />

        {/* Values column */}
        <StyledRelationValues $hasSuggester={hasSuggester}>
          {currentRelations.map((relation, key) =>
            isCloudType ? (
              <EntityDetailCloudRelation
                key={key}
                relation={relation}
                entityId={entity.id}
                relations={selectedRelations}
                entities={entities}
                relationUpdateMutation={relationUpdateMutation}
                relationDeleteMutation={relationDeleteMutation}
                userCanEdit={userCanEdit}
              />
            ) : (
              <EntityDetailRelationRow
                key={relation.id}
                index={key}
                relation={relation}
                entities={entities}
                entityId={entity.id}
                relationRule={relationRule}
                relationType={relationType}
                relationUpdateMutation={relationUpdateMutation}
                relationDeleteMutation={relationDeleteMutation}
                hasOrder={
                  hasOrder && currentRelations.length > 1 && userCanEdit
                }
                moveRow={moveRow}
                updateOrderFn={updateOrderFn}
                userCanEdit={userCanEdit}
              />
            )
          )}
        </StyledRelationValues>

        <StyledLabelSuggester>
          {hasSuggester && (
            <StyledSuggesterWrapper>
              <EntitySuggester
                inputWidth="full"
                excludedEntityClasses={excludedSuggesterEntities}
                disableTemplatesAccept
                categoryTypes={getCategoryTypes()}
                onSelected={(selectedId: string) => {
                  if (isCloudType) {
                    setTempCloudEntityId(selectedId);
                  } else {
                    handleMultiSelected(selectedId);
                  }
                }}
                excludedActantIds={usedEntityIds}
                disabled={!userCanEdit}
                alwaysShowCreateModal
              />
            </StyledSuggesterWrapper>
          )}
        </StyledLabelSuggester>
      </div>
      <div>
        {relationRule.graph && graphOpen && (
          <EntityDetailRelationGraph
            entities={entities}
            relations={
              currentRelations as Relation.IConnection<Relation.IRelation>[]
            }
            relationType={relationType}
            entity={entity}
            relationRule={relationRule}
          />
        )}
      </div>
    </StyledRelationBlock>
  );
};
