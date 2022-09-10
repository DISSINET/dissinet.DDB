import { EntityEnums, RelationEnums } from "@shared/enums";
import { IResponseDetail } from "@shared/types";
import { Relation } from "@shared/types/relation";
import api from "api";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "react-query";
import { v4 as uuidv4 } from "uuid";
import { StyledDetailForm } from "../EntityDetailStyles";
import { EntityDetailRelationTypeBlock } from "./EntityDetailRelationTypeBlock/EntityDetailRelationTypeBlock";

const restrictedIClasses = [
  EntityEnums.Class.Action,
  EntityEnums.Class.Concept,
];
interface EntityDetailRelationsSection {
  entity: IResponseDetail;
}
export const EntityDetailRelationsSection: React.FC<
  EntityDetailRelationsSection
> = ({ entity }) => {
  const [filteredRelationTypes, setFilteredRelationTypes] = useState<string[]>(
    []
  );

  // useEffect(() => {
  //   const newRelation: Relation.IModel = {
  //     id: uuidv4(),
  //     type: RelationEnums.Type.Classification,
  //     entityIds: [entity.id, "T1"],
  //   };
  //   api.relationCreate(newRelation);
  // }, []);

  // useEffect(() => {
  //   api.relationDelete("0c499bec-0b72-4e0e-96cd-4f4c32a2c2c0");
  // }, []);

  const relationCreateMutation = useMutation(
    async (newRelation: Relation.IModel) =>
      await api.relationCreate(newRelation),
    {
      onSuccess: (data, variables) => {
        // TODO
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
      },
    }
  );
  const relationDeleteMutation = useMutation(
    async (relationId: string) => await api.relationDelete(relationId),
    {
      onSuccess: (data, variables) => {
        // TODO
      },
    }
  );

  useEffect(() => {
    const relationRules = Object.keys(Relation.RelationRules);
    const filteredTypes = relationRules.filter((rule) => {
      if (
        !Relation.RelationRules[rule].allowedEntitiesPattern.length &&
        !(
          rule === RelationEnums.Type.Identification &&
          restrictedIClasses.includes(entity.class)
        )
      ) {
        return rule;
      } else if (
        Relation.RelationRules[rule].allowedEntitiesPattern.some(
          (pair) => pair[0] === entity.class
        )
      ) {
        return rule;
      }
    });

    setFilteredRelationTypes(filteredTypes);
  }, [entity]);

  const { relations } = entity;

  const allEntityIds = relations.map((r) => r.entityIds).flat(1);
  const noDuplicates = [...new Set(allEntityIds)].filter((id) => id.length > 0);

  const { data: entities } = useQuery(
    ["relation-entities", noDuplicates],
    async () => {
      const res = await api.entitiesSearch({ entityIds: noDuplicates });
      return res.data;
    },
    {
      enabled: api.isLoggedIn(),
    }
  );

  return (
    <StyledDetailForm>
      {filteredRelationTypes.map((relationType, key) => {
        const filteredRelations = relations.filter(
          (r) => r.type === relationType
        );
        return (
          <EntityDetailRelationTypeBlock
            key={key}
            entities={entities}
            relationType={relationType}
            relations={filteredRelations}
          />
        );
      })}
    </StyledDetailForm>
  );
};
