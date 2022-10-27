import { EntityEnums, RelationEnums } from "@shared/enums";
import { IResponseDetail } from "@shared/types";
import { Relation } from "@shared/types/relation";
import api from "api";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { restrictedIDEClasses } from "Theme/constants";
import { getEntityRelationRules } from "utils";
import { StyledDetailForm } from "../EntityDetailStyles";
import { EntityDetailRelationTypeBlock } from "./EntityDetailRelationTypeBlock/EntityDetailRelationTypeBlock";

interface EntityDetailRelationsSection {
  entity: IResponseDetail;
}
export const EntityDetailRelationsSection: React.FC<
  EntityDetailRelationsSection
> = ({ entity }) => {
  const queryClient = useQueryClient();
  const [filteredRelationTypes, setFilteredRelationTypes] = useState<string[]>(
    []
  );

  const relationCreateMutation = useMutation(
    async (newRelation: Relation.IRelation) =>
      await api.relationCreate(newRelation),
    {
      onSuccess: (data, variables) => {
        // TODO
        queryClient.invalidateQueries("entity");
      },
    }
  );

  const relationUpdateMutation = useMutation(
    async (relationObject: { relationId: string; changes: any }) =>
      await api.relationUpdate(
        relationObject.relationId,
        relationObject.changes
      ),
    {
      onSuccess: (data, variables) => {
        // TODO
        queryClient.invalidateQueries("entity");
      },
    }
  );
  const relationDeleteMutation = useMutation(
    async (relationId: string) => await api.relationDelete(relationId),
    {
      onSuccess: (data, variables) => {
        // TODO
        queryClient.invalidateQueries("entity");
      },
    }
  );

  useEffect(() => {
    const filteredTypes = getEntityRelationRules(entity);
    setFilteredRelationTypes(filteredTypes);
  }, [entity]);

  const { relations } = entity;

  // TODO: move to useMemo!
  const allEntityIds = relations.map((r) => r.entityIds).flat(1);
  const noDuplicates = [...new Set(allEntityIds)].filter((id) => id.length > 0);

  const { data: entities } = useQuery(
    ["relation-entities", noDuplicates],
    async () => {
      const res = await api.entitiesSearch({ entityIds: noDuplicates });
      return res.data;
    },
    {
      enabled: api.isLoggedIn() && noDuplicates.length > 0,
    }
  );

  return (
    <StyledDetailForm>
      {filteredRelationTypes.map((relationType, key) => {
        const filteredRelations = relations.filter(
          (r) => r.type === relationType
        );
        const isCloudType = Relation.RelationRules[relationType].cloudType;
        const isMultiple = Relation.RelationRules[relationType].multiple;
        return (
          <EntityDetailRelationTypeBlock
            key={key}
            entities={entities}
            relationType={relationType}
            relations={filteredRelations}
            isCloudType={isCloudType}
            isMultiple={isMultiple}
            relationCreateMutation={relationCreateMutation}
            relationUpdateMutation={relationUpdateMutation}
            relationDeleteMutation={relationDeleteMutation}
            entity={entity}
          />
        );
      })}
    </StyledDetailForm>
  );
};
