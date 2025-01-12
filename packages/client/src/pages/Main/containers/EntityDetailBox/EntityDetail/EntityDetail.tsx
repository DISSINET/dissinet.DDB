import { entitiesDictKeys } from "@shared/dictionaries";
import { EntityEnums, UserEnums } from "@shared/enums";
import {
  IEntity,
  IProp,
  IReference,
  IResponseDetail,
  Relation,
} from "@shared/types";
import { ITerritoryValidation } from "@shared/types/territory";
import { IWarningPositionSection } from "@shared/types/warning";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import {
  Button,
  CustomScrollbar,
  Loader,
  Message,
  Submit,
  ToastWithLink,
} from "components";
import {
  ApplyTemplateModal,
  AuditTable,
  EntityTag,
  JSONExplorer,
} from "components/advanced";
import { CMetaProp, DProps } from "constructors";
import { useSearchParams } from "hooks";
import React, { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  DraggedPropRowCategory,
  DropdownItem,
  PropAttributeFilter,
} from "types";
import { getEntityLabel, getShortLabelByLetterCount } from "utils/utils";
import { EntityReferenceTable } from "../../EntityReferenceTable/EntityReferenceTable";
import { PropGroup } from "../../PropGroup/PropGroup";
import { EntityDetailCreateTemplateModal } from "./EntityDetailCreateTemplateModal/EntityDetailCreateTemplateModal";
import { EntityDetailFormSection } from "./EntityDetailFormSection/EntityDetailFormSection";
import { EntityDetailHeaderRow } from "./EntityDetailHeaderRow/EntityDetailHeaderRow";
import { EntityDetailProtocol } from "./EntityDetailProtocol/EntityDetailProtocol";
import { EntityDetailRelations } from "./EntityDetailRelations/EntityDetailRelations";
import { EntityDetailSectionButtons } from "./EntityDetailSectionButtons/EntityDetailSectionButtons";
import {
  StyledDetailSection,
  StyledDetailSectionContent,
  StyledDetailSectionContentUsedIn,
  StyledDetailSectionEntityList,
  StyledDetailSectionHeader,
  StyledDetailSectionHeading,
  StyledDetailWarnings,
  StyledDetailWrapper,
  StyledPropGroupWrap,
  StyledUsedAsHeading,
  StyledUsedAsTitle,
} from "./EntityDetailStyles";
import { EntityDetailClassificationTable } from "./EntityDetailUsedInTable/EntityDetailClassificationTable/EntityDetailClassificationTable";
import { EntityDetailIdentificationTable } from "./EntityDetailUsedInTable/EntityDetailIdentificationTable/EntityDetailIdentificationTable";
import { EntityDetailMetaPropsTable } from "./EntityDetailUsedInTable/EntityDetailMetaPropsTable/EntityDetailMetaPropsTable";
import { EntityDetailStatementPropsTable } from "./EntityDetailUsedInTable/EntityDetailStatementPropsTable/EntityDetailStatementPropsTable";
import { EntityDetailStatementsTable } from "./EntityDetailUsedInTable/EntityDetailStatementsTable/EntityDetailStatementsTable";
import { EntityDetailValency } from "./EntityDetailValency/EntityDetailValency";
import { EntityDetailValidationSection } from "./EntityDetailValidationSection/EntityDetailValidationSection";
import { EntityDetailUsedInDocumentsTable } from "./EntityDetailUsedInTable/EntityDetailUsedInDocumentsTable/EntityDetailUsedInDocumentsTable";

const allowedEntityChangeClasses = [
  EntityEnums.Class.Value,
  EntityEnums.Class.Person,
  EntityEnums.Class.Being,
  EntityEnums.Class.Event,
  EntityEnums.Class.Group,
  EntityEnums.Class.Location,
  EntityEnums.Class.Object,
];

interface EntityDetail {
  detailId: string;
  entity: IResponseDetail;
  error: Error | null;
  isFetching: boolean;
}
export const EntityDetail: React.FC<EntityDetail> = ({
  detailId,
  entity,
  error,
  isFetching,
}) => {
  const {
    statementId,
    setStatementId,
    territoryId,
    setTerritoryId,
    removeDetailId,
    setSelectedDetailId,
    appendDetailId,
    detailIdArray,
    selectedDetailId,
  } = useSearchParams();

  useEffect(() => {
    if (error && (error as any).message === "unknown class for entity") {
      removeDetailId(detailId);
    }
  }, [error]);

  const [selectedEntityType, setSelectedEntityType] =
    useState<EntityEnums.Class>();
  const [createTemplateModal, setCreateTemplateModal] =
    useState<boolean>(false);
  const [showRemoveSubmit, setShowRemoveSubmit] = useState<boolean>(false);
  const [showTypeSubmit, setShowTypeSubmit] = useState(false);
  const [showApplyTemplateModal, setShowApplyTemplateModal] =
    useState<boolean>(false);
  const [templateToApply, setTemplateToApply] = useState<IEntity | false>(
    false
  );

  const selectedEntityTypeLabel: string = useMemo(() => {
    return selectedEntityType ? entitiesDictKeys[selectedEntityType].label : "";
  }, [selectedEntityType]);

  const handleAskForTemplateApply = (templateIdToApply: string) => {
    if (templates) {
      const templateThatIsGoingToBeApplied = templates.find(
        (template: IEntity) => template.id === templateIdToApply
      );

      if (templateThatIsGoingToBeApplied) {
        setTemplateToApply(templateThatIsGoingToBeApplied);
        setShowApplyTemplateModal(true);
      }
    }
  };

  const queryClient = useQueryClient();

  const isClassChangeable =
    entity && allowedEntityChangeClasses.includes(entity.class);

  const {
    status: templateStatus,
    data: templates,
    error: templateError,
    isFetching: isFetchingTemplates,
  } = useQuery({
    queryKey: ["entity-templates", "templates", entity?.class],
    queryFn: async () => {
      if (entity) {
        const res = await api.entitiesSearch({
          onlyTemplates: true,
          class: entity?.class,
        });

        const templates = res.data;
        templates.sort((a: IEntity, b: IEntity) =>
          a.labels[0].toLocaleLowerCase() > b.labels[0].toLocaleLowerCase()
            ? 1
            : -1
        );
        return templates;
      }
    },
    enabled: !!entity && api.isLoggedIn(),
  });

  const templateOptions: DropdownItem[] = useMemo(() => {
    const options =
      entity !== undefined && templates
        ? templates
            .filter((template) => template.id !== entity.id)
            .map((template) => ({
              value: template.id,
              label: getShortLabelByLetterCount(getEntityLabel(template), 200),
            }))
        : [];

    return options;
  }, [templates, entity]);

  // Audit query
  const {
    status: statusAudit,
    data: audit,
    error: auditError,
    isFetching: isFetchingAudit,
  } = useQuery({
    queryKey: ["audit", detailId],
    queryFn: async () => {
      const res = await api.auditGet(detailId);
      return res.data;
    },
    enabled: !!detailId && api.isLoggedIn(),
  });

  // refetch audit when statement changes
  useEffect(() => {
    if (entity !== undefined) {
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    }
  }, [entity]);

  useEffect(() => {
    if (entity !== undefined) {
      setSelectedEntityType(entity.class);
    }
  }, []);

  const userCanAdmin: boolean = useMemo(() => {
    return !!entity && entity.right === UserEnums.RoleMode.Admin;
  }, [entity]);

  const userCanEdit: boolean = useMemo(() => {
    return (
      !!entity &&
      (entity.right === UserEnums.RoleMode.Admin ||
        entity.right === UserEnums.RoleMode.Write)
    );
  }, [entity]);

  const {
    status: statusStatement,
    data: statement,
    error: statementError,
    isFetching: isFetchingStatement,
  } = useQuery({
    queryKey: ["statement", statementId],
    queryFn: async () => {
      const res = await api.statementGet(statementId);
      return res.data;
    },
    enabled: !!statementId && api.isLoggedIn(),
  });

  const updateEntityMutation = useMutation({
    mutationFn: async (changes: Partial<IEntity>) =>
      await api.entityUpdate(detailId, changes),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity"] });

      if (
        statementId &&
        (statementId === entity?.id ||
          (statement?.entities &&
            entity &&
            Object.keys(statement.entities).includes(entity.id)))
      ) {
        queryClient.invalidateQueries({ queryKey: ["statement"] });
      }

      if (
        variables.references !== undefined ||
        variables.detail !== undefined ||
        variables.labels !== undefined ||
        variables.status ||
        variables.language !== undefined ||
        variables.data?.logicalType
      ) {
        queryClient.invalidateQueries({ queryKey: ["suggestion"] });
        if (entity?.class === EntityEnums.Class.Territory) {
          queryClient.invalidateQueries({ queryKey: ["tree"] });
        }

        queryClient.invalidateQueries({ queryKey: ["territory"] });
        queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      }
      if (variables.labels !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["detail-tab-entities"] });
      }
      if (entity?.isTemplate) {
        queryClient.invalidateQueries({ queryKey: ["templates"] });
        queryClient.invalidateQueries({ queryKey: ["entity-templates"] });
        if (entity?.class === EntityEnums.Class.Statement) {
          queryClient.invalidateQueries({ queryKey: ["statement-templates"] });
        }
      }
    },
  });

  const changeEntityTypeMutation = useMutation({
    mutationFn: async (newClass: EntityEnums.Class) =>
      await api.entityUpdate(detailId, { class: newClass }),

    onSuccess: (data, variables) => {
      setShowTypeSubmit(false);
      queryClient.invalidateQueries({ queryKey: ["entity"] });
      queryClient.invalidateQueries({ queryKey: ["statement"] });
      if (variables === EntityEnums.Class.Territory) {
        queryClient.invalidateQueries({ queryKey: ["tree"] });
      }
      queryClient.invalidateQueries({ queryKey: ["territory"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      if (entity?.isTemplate) {
        queryClient.invalidateQueries({ queryKey: ["templates"] });
      }
    },
  });

  const deleteEntityMutation = useMutation({
    mutationFn: (entityId: string) => api.entityDelete(entityId),
    onSuccess: async (data, entityId) => {
      toast.info(
        <ToastWithLink
          children={`Entity removed!`}
          linkText={"Restore"}
          onLinkClick={async () => {
            const response = await api.entityRestore(entityId);
            toast.info("Entity restored");
            appendDetailId(entityId);
            queryClient.invalidateQueries({ queryKey: ["entity"] });
            queryClient.invalidateQueries({ queryKey: ["statement"] });
            if (entity?.class === EntityEnums.Class.Territory) {
              queryClient.invalidateQueries({ queryKey: ["tree"] });
            }
            queryClient.invalidateQueries({ queryKey: ["territory"] });
            queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
            if (entity?.isTemplate) {
              queryClient.invalidateQueries({ queryKey: ["templates"] });
            }
          }}
        />,
        {
          autoClose: 5000,
        }
      );

      // hide selected territory if T removed
      if (
        entity &&
        entity.class == EntityEnums.Class.Territory &&
        entity.id === territoryId
      ) {
        setTerritoryId("");
      } else {
        queryClient.invalidateQueries({ queryKey: ["territory"] });
      }

      // hide editor box if the removed entity was also opened in the editor
      if (
        entity &&
        entity.class == EntityEnums.Class.Statement &&
        entity.id === statementId
      ) {
        setStatementId("");
      } else {
        queryClient.invalidateQueries({ queryKey: ["statement"] });
      }

      queryClient.invalidateQueries({ queryKey: ["tree"] });

      removeDetailId(entityId);
    },
    onError: async (error) => {
      if (
        (error as any).error === "InvalidDeleteError" &&
        (error as any).data &&
        (error as any).data.length > 0
      ) {
        const { data } = error as any;
        toast.info("Click to open conflicting entity in detail", {
          autoClose: 6000,
          onClick: () => {
            appendDetailId(data[0]);
          },
        });
      }
    },
  });

  // Props handling

  // adding only second or third level
  // function adding the first level prop is in the button
  const addMetaProp = (originId: string) => {
    if (entity !== undefined) {
      const newProp = CMetaProp();
      const newProps = [...entity.props];

      newProps.forEach((prop1, pi1) => {
        if (prop1.id === originId) {
          newProps[pi1].children = [...newProps[pi1].children, newProp];
        }

        // 3rd level
        newProps[pi1].children.forEach((prop2, pi2) => {
          if (prop2.id == originId) {
            newProps[pi1].children[pi2].children = [
              ...newProps[pi1].children[pi2].children,
              newProp,
            ];
          }
        });
      });

      updateEntityMutation.mutate({ props: newProps });
    }
  };

  const updateProp = (propId: string, changes: Partial<IProp>) => {
    if (entity !== undefined) {
      const newProps = [...entity.props];

      newProps.forEach((prop1, pi1) => {
        // 1st level
        if (prop1.id === propId) {
          newProps[pi1] = { ...newProps[pi1], ...changes };
        }

        // 2nd level
        prop1.children.forEach((prop2, pi2) => {
          if (prop2.id === propId) {
            newProps[pi1].children[pi2] = {
              ...newProps[pi1].children[pi2],
              ...changes,
            };
          }

          // 3rd level
          prop1.children[pi2].children.forEach((prop3, pi3) => {
            if (prop3.id === propId) {
              newProps[pi1].children[pi2].children[pi3] = {
                ...newProps[pi1].children[pi2].children[pi3],
                ...changes,
              };
            }
          });
        });
      });
      updateEntityMutation.mutate({ props: newProps });
    }
  };

  const removeProp = (propId: string) => {
    if (entity !== undefined) {
      const newProps = [...entity.props].filter(
        (prop, pi) => prop.id !== propId
      );

      // 2nd level
      newProps.forEach((prop1, pi1) => {
        newProps[pi1].children = prop1.children.filter(
          (child) => child.id !== propId
        );

        // 3rd level
        newProps[pi1].children.forEach((prop2, pi2) => {
          newProps[pi1].children[pi2].children = newProps[pi1].children[
            pi2
          ].children.filter((child) => child.id !== propId);
        });
      });

      updateEntityMutation.mutate({ props: newProps });
    }
  };

  const changeOrder = (
    propId: string,
    props: IProp[],
    oldIndex: number,
    newIndex: number
  ) => {
    for (let prop of props) {
      if (prop.id === propId) {
        props.splice(newIndex, 0, props.splice(oldIndex, 1)[0]);
        return props;
      }
      for (let prop1 of prop.children) {
        if (prop1.id === propId) {
          prop.children.splice(
            newIndex,
            0,
            prop.children.splice(oldIndex, 1)[0]
          );
          return props;
        }
        for (let prop2 of prop1.children) {
          if (prop2.id === propId) {
            prop1.children.splice(
              newIndex,
              0,
              prop1.children.splice(oldIndex, 1)[0]
            );
            return props;
          }
        }
      }
    }
    return props;
  };

  const movePropToIndex = (
    propId: string,
    oldIndex: number,
    newIndex: number
  ) => {
    if (entity !== undefined) {
      const newProps = [...entity.props];
      changeOrder(propId, newProps, oldIndex, newIndex);

      updateEntityMutation.mutate({ props: newProps });
    }
  };

  useEffect(() => {
    if (error && (error as any).error === "EntityDoesNotExist") {
      removeDetailId(detailId);
      if (detailIdArray.length) {
        setSelectedDetailId(detailIdArray[0]);
      }
    }
  }, [error]);

  const mayBeRemoved = useMemo(() => {
    return (
      entity && entity.usedInStatements && entity.usedInStatements.length === 0
    );
  }, [entity]);

  const actantMode = useMemo(() => {
    const actantClass = entity?.class;
    if (actantClass) {
      if (actantClass === EntityEnums.Class.Action) {
        return "action";
      } else if (actantClass === EntityEnums.Class.Territory) {
        return "territory";
      } else if (actantClass === EntityEnums.Class.Resource) {
        return "resource";
      } else if (actantClass === EntityEnums.Class.Concept) {
        return "concept";
      }
    }
    return "entity";
  }, [entity]);

  const isTerritoryWithParent = (entity: IResponseDetail): boolean => {
    return (
      entity.class === EntityEnums.Class.Territory &&
      entity.data.parent &&
      Object.keys(entity.entities).includes(entity.data.parent.territoryId)
    );
  };

  const isStatementWithTerritory = (entity: IResponseDetail): boolean => {
    return (
      entity.class === EntityEnums.Class.Statement &&
      entity.data.territory &&
      Object.keys(entity.entities).includes(entity.data.territory.territoryId)
    );
  };

  const getTerritoryId = (entity: IResponseDetail) => {
    if (isTerritoryWithParent(entity)) {
      return entity.entities[entity.data.parent.territoryId].id;
    } else if (isStatementWithTerritory(entity)) {
      return entity.entities[entity.data.territory.territoryId].id;
    } else {
      return undefined;
    }
  };

  const relationCreateMutation = useMutation({
    mutationFn: async (newRelation: Relation.IRelation) =>
      await api.relationCreate(newRelation),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity"] });
    },
  });

  const relationUpdateMutation = useMutation({
    mutationFn: async (relationObject: {
      relationId: string;
      changes: Partial<Relation.IRelation>;
    }) =>
      await api.relationUpdate(
        relationObject.relationId,
        relationObject.changes
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity"] });
    },
  });
  const relationDeleteMutation = useMutation({
    mutationFn: async (relationId: string) =>
      await api.relationDelete(relationId),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity"] });
    },
  });

  const isInsideTemplate = entity?.isTemplate || false;

  const [showBatchRemovePropSubmit, setShowBatchRemovePropSubmit] =
    useState(false);
  const [loadingValidations, setLoadingValidations] = useState(false);

  return (
    <>
      {entity && (
        <CustomScrollbar>
          <>
            <EntityDetailHeaderRow
              entity={entity}
              userCanEdit={userCanEdit}
              mayBeRemoved={mayBeRemoved}
              setShowRemoveSubmit={setShowRemoveSubmit}
              setCreateTemplateModal={setCreateTemplateModal}
            />

            <StyledDetailWrapper>
              {/* form section */}
              <StyledDetailSection $firstSection>
                <StyledDetailSectionContent $firstSection>
                  <StyledDetailWarnings>
                    {entity.warnings &&
                      entity.warnings
                        .filter(
                          (w) =>
                            w.position?.section ===
                            IWarningPositionSection.Entity
                        )
                        .map((warning, key) => {
                          return <Message key={key} warning={warning} />;
                        })}
                  </StyledDetailWarnings>
                  <EntityDetailFormSection
                    entity={entity}
                    userCanEdit={userCanEdit}
                    userCanAdmin={userCanAdmin}
                    actantMode={actantMode}
                    isStatementWithTerritory={isStatementWithTerritory}
                    isClassChangeable={isClassChangeable || false}
                    isTerritoryWithParent={isTerritoryWithParent}
                    allowedEntityChangeClasses={allowedEntityChangeClasses}
                    handleAskForTemplateApply={handleAskForTemplateApply}
                    setSelectedEntityType={setSelectedEntityType}
                    setShowTypeSubmit={setShowTypeSubmit}
                    templateOptions={templateOptions}
                    updateEntityMutation={updateEntityMutation}
                  />
                </StyledDetailSectionContent>
              </StyledDetailSection>

              {/* Protocol */}
              {entity.class === EntityEnums.Class.Territory && (
                <StyledDetailSection>
                  <StyledDetailSectionHeader>
                    Protocol
                  </StyledDetailSectionHeader>
                  <StyledDetailSectionContent>
                    <EntityDetailProtocol
                      territory={entity}
                      updateEntityMutation={updateEntityMutation}
                      isInsideTemplate={isInsideTemplate}
                      userCanEdit={userCanEdit}
                    />
                  </StyledDetailSectionContent>
                </StyledDetailSection>
              )}

              {/* Validation rules */}
              {entity.class === EntityEnums.Class.Territory && (
                <StyledDetailSection>
                  <EntityDetailValidationSection
                    validations={
                      entity.data.validations as
                        | ITerritoryValidation[]
                        | undefined
                    }
                    entities={entity.entities}
                    updateEntityMutation={updateEntityMutation}
                    userCanEdit={userCanEdit}
                    isInsideTemplate={isInsideTemplate}
                    territoryParentId={getTerritoryId(entity)}
                    entity={entity}
                    setLoadingValidations={setLoadingValidations}
                  />
                </StyledDetailSection>
              )}

              {/* Valency (A) */}
              {entity.class === EntityEnums.Class.Action && (
                <StyledDetailSection>
                  <StyledDetailSectionHeader>Valency</StyledDetailSectionHeader>
                  <StyledDetailWarnings>
                    {entity.warnings &&
                      entity.warnings
                        .filter(
                          (w) =>
                            w.position?.section ===
                            IWarningPositionSection.Valencies
                        )
                        .map((warning, key) => {
                          return <Message key={key} warning={warning} />;
                        })}
                  </StyledDetailWarnings>
                  <StyledDetailSectionContent>
                    <EntityDetailValency
                      entity={entity}
                      userCanEdit={userCanEdit}
                      updateEntityMutation={updateEntityMutation}
                      relationCreateMutation={relationCreateMutation}
                      relationUpdateMutation={relationUpdateMutation}
                      relationDeleteMutation={relationDeleteMutation}
                    />
                  </StyledDetailSectionContent>
                </StyledDetailSection>
              )}

              {/* Relations */}
              <StyledDetailSection>
                <StyledDetailSectionHeader>Relations</StyledDetailSectionHeader>
                <StyledDetailWarnings>
                  {entity.warnings &&
                    entity.warnings
                      .filter(
                        (w) =>
                          w.position?.section ===
                          IWarningPositionSection.Relations
                      )
                      .map((warning, key) => {
                        return <Message key={key} warning={warning} />;
                      })}
                </StyledDetailWarnings>
                <StyledDetailSectionContent>
                  <EntityDetailRelations
                    entity={entity}
                    relationCreateMutation={relationCreateMutation}
                    relationUpdateMutation={relationUpdateMutation}
                    relationDeleteMutation={relationDeleteMutation}
                    userCanEdit={userCanEdit}
                  />
                </StyledDetailSectionContent>
              </StyledDetailSection>

              {/* metaprops section */}
              <StyledDetailSection $metaSection>
                <StyledDetailSectionHeader>
                  <StyledDetailSectionHeading>
                    Metaproperties
                  </StyledDetailSectionHeading>
                  {userCanEdit && (
                    <EntityDetailSectionButtons
                      entityId={entity.id}
                      setShowSubmit={setShowBatchRemovePropSubmit}
                      removeBtnTooltip="remove all metaproperties from entity"
                      removeBtnDisabled={!entity.props.length}
                      handleCopyFromEntity={(pickedEntity, replace) => {
                        if (pickedEntity.props.length === 0) {
                          toast.info("no metaprops");
                        } else {
                          if (replace) {
                            updateEntityMutation.mutate({
                              props: DProps(pickedEntity.props),
                            });
                          } else {
                            updateEntityMutation.mutate({
                              props: [
                                ...entity.props,
                                ...DProps(pickedEntity.props),
                              ],
                            });
                          }
                        }
                      }}
                    />
                  )}
                </StyledDetailSectionHeader>

                <StyledDetailSectionContent>
                  <StyledPropGroupWrap>
                    <PropGroup
                      boxEntity={entity}
                      originId={entity.id}
                      entities={entity.entities}
                      props={entity.props}
                      territoryId={territoryId}
                      updateProp={updateProp}
                      removeProp={removeProp}
                      addProp={addMetaProp}
                      addPropWithEntityId={(variables: {
                        typeEntityId?: string;
                        valueEntityId?: string;
                      }) => {
                        const newProp = CMetaProp(variables);
                        updateEntityMutation.mutate({
                          props: [...entity.props, newProp],
                        });
                      }}
                      userCanEdit={userCanEdit}
                      openDetailOnCreate={false}
                      movePropToIndex={(propId, oldIndex, newIndex) => {
                        movePropToIndex(propId, oldIndex, newIndex);
                      }}
                      category={DraggedPropRowCategory.META_PROP}
                      disabledAttributes={
                        {
                          statement: ["moodvariant", "mood", "bundleOperator"],
                          type: ["logic", "virtuality", "partitivity"],
                          value: ["logic", "virtuality", "partitivity"],
                        } as PropAttributeFilter
                      }
                      isInsideTemplate={isInsideTemplate}
                      territoryParentId={getTerritoryId(entity)}
                      lowIdent
                      alwaysShowCreateModal
                    />
                  </StyledPropGroupWrap>
                  {userCanEdit && (
                    <Button
                      color="primary"
                      label="new metaproperty"
                      icon={<FaPlus />}
                      onClick={() => {
                        const newProp = CMetaProp();
                        updateEntityMutation.mutate({
                          props: [...entity.props, newProp],
                        });
                      }}
                    />
                  )}
                </StyledDetailSectionContent>
              </StyledDetailSection>

              {/* reference section */}
              <StyledDetailSection>
                <StyledDetailSectionHeader>
                  References
                </StyledDetailSectionHeader>
                <StyledDetailSectionContent>
                  <EntityReferenceTable
                    disabled={!userCanEdit}
                    references={entity.references ?? []}
                    entities={entity.entities}
                    entityId={entity.id}
                    onChange={(newValues: IReference[]) => {
                      updateEntityMutation.mutate({ references: newValues });
                    }}
                    isInsideTemplate={isInsideTemplate}
                    userCanEdit={userCanEdit}
                    alwaysShowCreateModal
                  />
                </StyledDetailSectionContent>
              </StyledDetailSection>

              <StyledDetailSection>
                <StyledDetailSectionHeader>Used in:</StyledDetailSectionHeader>

                {/* used as template */}
                {entity.isTemplate && entity.usedAsTemplate && (
                  <StyledDetailSectionContentUsedIn key="as template">
                    <StyledUsedAsHeading>
                      <StyledUsedAsTitle>
                        <b>{entity.usedAsTemplate.length}</b> As a template
                      </StyledUsedAsTitle>
                    </StyledUsedAsHeading>
                    <StyledDetailSectionEntityList>
                      {entity.usedAsTemplate.map((entityId) => (
                        <React.Fragment key={entityId}>
                          <div style={{ display: "inline-grid" }}>
                            <EntityTag
                              entity={entity.entities[entityId]}
                              fullWidth
                            />
                          </div>
                        </React.Fragment>
                      ))}
                    </StyledDetailSectionEntityList>
                  </StyledDetailSectionContentUsedIn>
                )}

                {/* usedIn props */}
                {!entity.isTemplate && (
                  <EntityDetailMetaPropsTable
                    title={{
                      singular: "Metaproperty",
                      plural: "Metaproperties",
                    }}
                    entities={entity.entities}
                    useCases={entity.usedInMetaProps}
                    key="MetaProp"
                    perPage={10}
                  />
                )}

                {/* usedIn statements */}
                {!entity.isTemplate && (
                  <EntityDetailStatementsTable
                    title={{ singular: "Statement", plural: "Statements" }}
                    entities={entity.entities}
                    useCases={entity.usedInStatements}
                    key="Statement"
                    perPage={10}
                  />
                )}

                {/* usedIn statement props */}
                {!entity.isTemplate && (
                  <EntityDetailStatementPropsTable
                    title={{
                      singular: "In-statement Property",
                      plural: "In-statement Properties",
                    }}
                    entities={entity.entities}
                    useCases={entity.usedInStatementProps}
                    key="StatementProp"
                    perPage={10}
                  />
                )}

                {/* usedIn statement identification */}
                {!entity.isTemplate && (
                  <EntityDetailIdentificationTable
                    title={{
                      singular: "In-statement Identification",
                      plural: "In-statement Identifications",
                    }}
                    entities={entity.entities}
                    useCases={entity.usedInStatementIdentifications}
                    key="StatementIdentification"
                    perPage={10}
                  />
                )}

                {/* usedIn statement classification */}
                {!entity.isTemplate && (
                  <EntityDetailClassificationTable
                    title={{
                      singular: "In-statement Classification",
                      plural: "In-statement Classifications",
                    }}
                    entities={entity.entities}
                    useCases={entity.usedInStatementClassifications}
                    key="StatementClassification"
                    perPage={10}
                  />
                )}

                {!entity.isTemplate && (
                  <EntityDetailUsedInDocumentsTable
                    title={{
                      singular: "Anchor",
                      plural: "Anchors",
                    }}
                    entities={entity.entities}
                    uses={entity.usedInDocuments}
                    perPage={10}
                  />
                )}
              </StyledDetailSection>

              {/* Audits */}
              <StyledDetailSection key="editor-section-audits">
                <StyledDetailSectionHeader>Audits</StyledDetailSectionHeader>
                <StyledDetailSectionContent>
                  {audit && <AuditTable {...audit} />}
                </StyledDetailSectionContent>
              </StyledDetailSection>

              {/* JSON */}
              <StyledDetailSection key="editor-section-json">
                <StyledDetailSectionHeader>JSON</StyledDetailSectionHeader>
                <StyledDetailSectionContent>
                  {entity && <JSONExplorer data={entity} />}
                </StyledDetailSectionContent>
              </StyledDetailSection>
            </StyledDetailWrapper>
          </>
        </CustomScrollbar>
      )}

      <Submit
        title="Delete entity"
        text="Do you really want to delete this entity?"
        submitLabel="Delete"
        entityToSubmit={entity}
        onSubmit={() => {
          deleteEntityMutation.mutate(detailId);
          setShowRemoveSubmit(false);
        }}
        onCancel={() => setShowRemoveSubmit(false)}
        show={showRemoveSubmit}
        loading={deleteEntityMutation.isPending}
      />
      <Submit
        title="Delete metaprops"
        text="Do you really want to delete all metaprops from this entity?"
        submitLabel="Delete"
        onSubmit={() => {
          updateEntityMutation.mutate({ props: [] });
          setShowBatchRemovePropSubmit(false);
        }}
        onCancel={() => setShowBatchRemovePropSubmit(false)}
        show={showBatchRemovePropSubmit}
        loading={updateEntityMutation.isPending}
      />
      <Submit
        title="Change entity type"
        text={`Changing entity type to: [${selectedEntityTypeLabel}]. You may loose some values. Do you want to continue?`}
        submitLabel="Continue"
        onSubmit={() => {
          if (selectedEntityType) {
            changeEntityTypeMutation.mutate(selectedEntityType);
          }
        }}
        onCancel={() => setShowTypeSubmit(false)}
        show={showTypeSubmit}
      />

      <Loader
        show={
          isFetching ||
          updateEntityMutation.isPending ||
          deleteEntityMutation.isPending ||
          changeEntityTypeMutation.isPending ||
          loadingValidations
        }
      />

      {entity && templateToApply && (
        <ApplyTemplateModal
          showModal={showApplyTemplateModal}
          entity={entity}
          setShowApplyTemplateModal={setShowApplyTemplateModal}
          updateEntityMutation={updateEntityMutation}
          templateToApply={templateToApply}
          setTemplateToApply={setTemplateToApply}
        />
      )}

      {entity && (
        <EntityDetailCreateTemplateModal
          setCreateTemplateModal={setCreateTemplateModal}
          entity={entity}
          showModal={createTemplateModal}
          userCanEdit={userCanEdit}
          updateEntityMutation={updateEntityMutation}
        />
      )}
    </>
  );
};
