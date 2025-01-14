import { EntityEnums, UserEnums, WarningTypeEnums } from "@shared/enums";
import {
  IEntity,
  IProp,
  IReference,
  IResponseStatement,
  IStatement,
  IStatementActant,
  IStatementAction,
  IStatementData,
} from "@shared/types";
import {
  UseMutationResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { excludedSuggesterEntities } from "Theme/constants";
import api from "api";
import { Button, Input, Message, MultiInput, Submit } from "components";
import Dropdown, {
  ApplyTemplateModal,
  AuditTable,
  BreadcrumbItem,
  EntitySuggester,
  EntityTag,
  JSONExplorer,
} from "components/advanced";
import {
  CClassification,
  CIdentification,
  CProp,
  CStatementActant,
  CStatementAction,
} from "constructors";
import { useSearchParams } from "hooks";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  AiOutlineCaretDown,
  AiOutlineCaretUp,
  AiOutlineWarning,
} from "react-icons/ai";
import { FaRegCopy } from "react-icons/fa";
import { TiWarningOutline } from "react-icons/ti";
import { toast } from "react-toastify";
import { setShowWarnings } from "redux/features/statementEditor/showWarningsSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { ThemeContext } from "styled-components";
import { DropdownItem, classesEditorActants, classesEditorTags } from "types";
import {
  deepCopy,
  getEntityLabel,
  getShortLabelByLetterCount,
} from "utils/utils";
import { EntityReferenceTable } from "../../EntityReferenceTable/EntityReferenceTable";
import {
  StyledBreadcrumbWrap,
  StyledDetailWarnings,
  StyledEditorContentRow,
  StyledEditorContentRowLabel,
  StyledEditorContentRowValue,
  StyledEditorHeaderInputWrap,
  StyledEditorPreSection,
  StyledEditorSection,
  StyledEditorSectionContent,
  StyledEditorSectionHeader,
  StyledEditorSectionHeading,
  StyledEditorStatementInfo,
  StyledEditorStatementInfoLabel,
  StyledEditorTemplateSection,
  StyledHeaderTagWrap,
  StyledMissingTerritory,
  StyledTagsList,
  StyledTagsListItem,
} from "../StatementEditorBoxStyles";
import { StatementEditorActantTable } from "./StatementEditorActantTable/StatementEditorActantTable";
import { StatementEditorActionTable } from "./StatementEditorActionTable/StatementEditorActionTable";
import { StatementEditorSectionButtons } from "./StatementEditorSectionButtons/StatementEditorSectionButtons";

const valencyErrorTypes: WarningTypeEnums[] = [
  WarningTypeEnums.MA,
  WarningTypeEnums.WA,
  WarningTypeEnums.ANA,
  WarningTypeEnums.WAC,
  WarningTypeEnums.AVU,
];

interface StatementEditor {
  statement: IResponseStatement;
  updateStatementMutation: UseMutationResult<
    void,
    unknown,
    IStatement,
    unknown
  >;
  moveStatementMutation: UseMutationResult<void, unknown, string, unknown>;

  handleAttributeChange: (
    changes: Partial<IStatement>,
    instantUpdate?: boolean
  ) => void;
  handleDataAttributeChange: (
    changes: Partial<IStatementData>,
    instantUpdate?: boolean
  ) => void;
}
export const StatementEditor: React.FC<StatementEditor> = ({
  statement,
  updateStatementMutation,
  moveStatementMutation,

  handleAttributeChange,
  handleDataAttributeChange,
}) => {
  const {
    statementId,
    territoryId,
    setTerritoryId,
    appendDetailId,
    appendMultipleDetailIds,
  } = useSearchParams();

  const queryClient = useQueryClient();
  const themeContext = useContext(ThemeContext);

  // Audit query
  const {
    status: statusAudit,
    data: audit,
    error: auditError,
    isFetching: isFetchingAudit,
  } = useQuery({
    queryKey: ["audit", statementId],
    queryFn: async () => {
      const res = await api.auditGet(statementId);
      return res.data;
    },
    enabled: !!statementId && api.isLoggedIn(),
  });

  // user query
  const username: string = useAppSelector((state) => state.username);
  const userId = localStorage.getItem("userid");
  const {
    status: statusUser,
    data: user,
    error: errorUser,
    isFetching: isFetchingUser,
  } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      if (userId) {
        const res = await api.usersGet(userId);
        return res.data;
      }
    },
    enabled: !!userId && api.isLoggedIn(),
  });

  // territory query
  const {
    status,
    data: territoryActants = [],
    error,
    isFetching,
  } = useQuery({
    queryKey: ["territoryActants", statement.data.territory?.territoryId],
    queryFn: async () => {
      if (statement.data.territory?.territoryId) {
        const res = await api.entityIdsInTerritory(
          statement.data.territory.territoryId
        );
        return res.data;
      } else {
        return [];
      }
    },
    enabled: !!statement.data.territory?.territoryId && api.isLoggedIn(),
  });

  // TEMPLATES
  const [showApplyTemplateModal, setShowApplyTemplateModal] =
    useState<boolean>(false);
  const [templateToApply, setTemplateToApply] = useState<IEntity | false>(
    false
  );

  const handleAskForTemplateApply = (templateOptionToApply: string) => {
    if (templates) {
      const templateThatIsGoingToBeApplied = templates.find(
        (template: IEntity) => template.id === templateOptionToApply
      );

      if (templateThatIsGoingToBeApplied) {
        setTemplateToApply(templateThatIsGoingToBeApplied);
        setShowApplyTemplateModal(true);
      }
    }
  };

  const {
    status: templateStatus,
    data: templates,
    error: templateError,
    isFetching: isFetchingTemplates,
  } = useQuery({
    queryKey: ["statement-templates"],
    queryFn: async () => {
      const res = await api.entitiesSearch({
        onlyTemplates: true,
        class: EntityEnums.Class.Statement,
      });

      const templates = res.data;
      templates.sort((a: IEntity, b: IEntity) =>
        a.labels[0].toLocaleLowerCase() > b.labels[0].toLocaleLowerCase()
          ? 1
          : -1
      );
      return templates;
    },
    enabled: !!statement && api.isLoggedIn(),
  });

  const templateOptions: DropdownItem[] = useMemo(() => {
    const options = templates
      ? templates
          .filter((template) => template.id !== statement.id)
          .map((template) => ({
            value: template.id,
            label: getShortLabelByLetterCount(getEntityLabel(template), 200),
          }))
      : [];

    return options;
  }, [templates, statement]);

  // refetch audit when statement changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["audit"] });
  }, [statement]);

  // stores territory id
  const statementTerritoryId: string | undefined = useMemo(() => {
    return statement.data.territory?.territoryId;
  }, [statement]);

  useEffect(() => {
    if (!territoryId && statementId && statementTerritoryId) {
      setTerritoryId(statementTerritoryId);
    }
  }, [territoryId, statementId, statementTerritoryId]);

  // get data for territory
  const {
    status: territoryStatus,
    data: territoryData,
    error: territoryError,
    isFetching: isFetchingTerritory,
  } = useQuery({
    queryKey: ["territory", "statement-editor", statementTerritoryId],
    queryFn: async () => {
      const res = await api.territoryGet(statementTerritoryId as string);
      return res.data;
    },
    enabled: !!statementId && !!statementTerritoryId,
  });

  // get data for the previous statement
  const previousStatement: false | IResponseStatement = useMemo(() => {
    if (territoryData) {
      let thisStatementIndex: false | number = false;
      territoryData.statements.forEach((s, si) => {
        if (s.id === statement.id) {
          thisStatementIndex = si;
        }
      });
      if (!!thisStatementIndex && thisStatementIndex > 0) {
        return territoryData.statements[thisStatementIndex - 1];
      } else {
        return false;
      }
    }
    return false;
  }, [territoryData, statement.id]);

  //TODO recurse to get all parents
  const territoryPath =
    territoryData &&
    territoryData.data?.parent &&
    Array(territoryData.data?.parent?.territoryId);

  const userCanEdit: boolean = useMemo(() => {
    return (
      statement.right === UserEnums.RoleMode.Admin ||
      statement.right === UserEnums.RoleMode.Write
    );
  }, [statement]);

  // actions
  const addAction = (newActionId: string) => {
    const newStatementAction = CStatementAction(newActionId);
    const newData = {
      actions: [...statement.data.actions, newStatementAction],
    };
    handleDataAttributeChange(newData, true);
  };

  const addActant = (newStatementActantId: string) => {
    const newStatementActant = CStatementActant(newStatementActantId);
    const newData = {
      actants: [...statement.data.actants, newStatementActant],
    };
    handleDataAttributeChange(newData, true);
  };

  // Props handling
  const addProp = (rowId: string) => {
    const newProp = CProp();
    const newStatementData = deepCopy(statement.data);

    [...newStatementData.actants, ...newStatementData.actions].forEach(
      (actant: IStatementActant | IStatementAction) => {
        // const actantId =
        // "id" in actant ? actant.id : actant.id;
        // adding 1st level prop
        if (actant.id === rowId) {
          actant.props = [...actant.props, newProp];
        }
        // adding 2nd level prop
        actant.props.forEach((prop1, pi1) => {
          if (prop1.id == rowId) {
            actant.props[pi1].children = [
              ...actant.props[pi1].children,
              newProp,
            ];
          }

          // adding 3rd level prop
          actant.props[pi1].children.forEach((prop2, pi2) => {
            if (prop2.id == rowId) {
              actant.props[pi1].children[pi2].children = [
                ...actant.props[pi1].children[pi2].children,
                newProp,
              ];
            }
          });
        });
      }
    );

    handleDataAttributeChange(newStatementData);
  };

  const addClassification = (rowId: string) => {
    const newClassification = CClassification();

    const newStatementData = deepCopy(statement.data);

    [...newStatementData.actants].forEach((actant: IStatementActant) => {
      if (actant.id === rowId) {
        actant.classifications = [...actant.classifications, newClassification];
      }
    });

    handleDataAttributeChange(newStatementData);
  };

  const addIdentification = (rowId: string) => {
    const newIdentification = CIdentification();
    const newStatementData = deepCopy(statement.data);

    [...newStatementData.actants].forEach((actant: IStatementActant) => {
      if (actant.id === rowId) {
        actant.identifications = [...actant.identifications, newIdentification];
      }
    });

    handleDataAttributeChange(newStatementData);
  };

  const updateProp = (
    propId: string,
    changes: Partial<IProp>,
    instantUpdate?: boolean,
    languageCheck?: boolean
  ) => {
    if (propId) {
      const isTypeOrValueChange =
        (changes.type &&
          changes.type.entityId &&
          changes.type.elvl !== EntityEnums.Elvl.Inferential) ||
        (changes.value &&
          changes.value.entityId &&
          changes.value.elvl !== EntityEnums.Elvl.Inferential);

      if (
        languageCheck &&
        isTypeOrValueChange &&
        user &&
        user.options.defaultStatementLanguage
      ) {
        checkTypeEntityLanguage(propId, changes, instantUpdate);
      } else {
        applyPropChanges(propId, changes, instantUpdate);
      }
    }
  };

  // checking if the language is not different from user.options.defaultStatementLanguage -> in that case, switch elvl to EntityEnums.Elvl.Inferential
  const checkTypeEntityLanguage = (
    propId: string,
    changes: any,
    instantUpdate?: boolean
  ) => {
    if (user) {
      const statementLanguage = user.options.defaultStatementLanguage;
      if (changes.type) {
        api.entitiesGet(changes.type?.entityId).then((typeEntity) => {
          if (typeEntity.data) {
            const entityLanguage = typeEntity.data.language;
            if (entityLanguage !== statementLanguage && changes.type) {
              changes.type.elvl = EntityEnums.Elvl.Inferential;
              applyPropChanges(propId, changes, instantUpdate);
              toast.info(
                `The language of the entity (${entityLanguage}) assigned to the property type slot does not correspondent with the user statement language (${user.options.defaultStatementLanguage}) .Epistemic level of property type's involvement changed to "inferential"`
              );
            }
          }
        });
      }
      if (changes.value) {
        api.entitiesGet(changes.value.entityId).then((valueEntity) => {
          if (valueEntity.data) {
            const entityLanguage = valueEntity.data.language;
            if (entityLanguage !== statementLanguage && changes.value) {
              changes.value.elvl = EntityEnums.Elvl.Inferential;
              applyPropChanges(propId, changes, instantUpdate);
              toast.info(
                `The language of the entity (${entityLanguage}) assigned to the property value slot does not correspondent with the user statement language (${user.options.defaultStatementLanguage}) .Epistemic level of property type's involvement changed to "inferential"`
              );
            }
          }
        });
      }
    }
    applyPropChanges(propId, changes);
  };

  const applyPropChanges = (
    propId: string,
    changes: Partial<IProp>,
    instantUpdate?: boolean
  ) => {
    const newStatementData = deepCopy(statement.data);
    [...newStatementData.actants, ...newStatementData.actions].forEach(
      (actant: IStatementActant | IStatementAction) => {
        actant.props.forEach((prop1, pi1) => {
          // 1st level
          if (prop1.id === propId) {
            actant.props[pi1] = { ...actant.props[pi1], ...changes };
          }

          // 2nd level
          actant.props[pi1].children.forEach((prop2, pi2) => {
            if (prop2.id === propId) {
              actant.props[pi1].children[pi2] = {
                ...actant.props[pi1].children[pi2],
                ...changes,
              };
            }

            // 3rd level
            actant.props[pi1].children[pi2].children.forEach((prop3, pi3) => {
              if (prop3.id === propId) {
                actant.props[pi1].children[pi2].children[pi3] = {
                  ...actant.props[pi1].children[pi2].children[pi3],
                  ...changes,
                };
              }
            });
          });
        });
      }
    );

    handleDataAttributeChange(newStatementData, instantUpdate);
  };

  const removeProp = (propId: string) => {
    if (propId) {
      const newStatementData = deepCopy(statement.data);

      [...newStatementData.actants, ...newStatementData.actions].forEach(
        (actant: IStatementActant | IStatementAction) => {
          actant.props = actant.props.filter(
            (actantProp) => actantProp.id !== propId
          );

          // 2nd level
          actant.props.forEach((prop1, pi1) => {
            actant.props[pi1].children = actant.props[pi1].children.filter(
              (childProp) => childProp.id != propId
            );

            // 3rd level
            actant.props[pi1].children.forEach((prop2, pi2) => {
              actant.props[pi1].children[pi2].children = actant.props[
                pi1
              ].children[pi2].children.filter(
                (childProp) => childProp.id != propId
              );
            });
          });
        }
      );

      handleDataAttributeChange(newStatementData);
    }
  };

  const changeOrder = <T extends IStatementActant | IStatementAction>(
    propId: string,
    actants: T[],
    oldIndex: number,
    newIndex: number
  ): T[] => {
    for (let actant of actants) {
      for (let prop of actant.props) {
        if (prop.id === propId) {
          actant.props.splice(newIndex, 0, actant.props.splice(oldIndex, 1)[0]);
          return actants;
        }
        for (let prop1 of prop.children) {
          if (prop1.id === propId) {
            prop.children.splice(
              newIndex,
              0,
              prop.children.splice(oldIndex, 1)[0]
            );
            return actants;
          }
          for (let prop2 of prop1.children) {
            if (prop2.id === propId) {
              prop1.children.splice(
                newIndex,
                0,
                prop1.children.splice(oldIndex, 1)[0]
              );
              return actants;
            }
          }
        }
      }
    }
    return actants;
  };

  const movePropToIndex = (
    propId: string,
    oldIndex: number,
    newIndex: number
  ) => {
    const { actions, actants, ...dataWithoutActants } = statement.data;
    const newActions = changeOrder(
      propId,
      deepCopy(actions),
      oldIndex,
      newIndex
    );
    const newActants = changeOrder(
      propId,
      deepCopy(actants),
      oldIndex,
      newIndex
    );

    const newStatementData = {
      actions: newActions,
      actants: newActants,
      ...dataWithoutActants,
    };

    handleDataAttributeChange(newStatementData, true);
  };

  //tags
  const addTag = (tagId: string) => {
    if (tagId) {
      const newData = { tags: [...statement.data.tags, tagId] };
      handleDataAttributeChange(newData, true);
    }
  };
  const removeTag = (tagId: string) => {
    if (tagId) {
      const newData = { tags: statement.data.tags.filter((p) => p !== tagId) };
      handleDataAttributeChange(newData);
    }
  };

  const [showSubmitSection, setShowSubmitSection] = useState<
    "actants" | "actions" | "references" | false
  >(false);

  const showWarnings = useAppSelector(
    (state) => state.statementEditor.showWarnings
  );
  const dispatch = useAppDispatch();

  // display
  useEffect(() => {
    if (showWarnings) {
      // check the action valency errors
      const valencyWarnings = statement.warnings.filter((w) =>
        valencyErrorTypes.includes(w.type)
      );

      const valencyWarningActions = statement.data.actions.filter((a) =>
        valencyWarnings.some((w) => w.position?.entityId === a.actionId)
      );

      if (valencyWarningActions.length > 0) {
        appendMultipleDetailIds(valencyWarningActions.map((a) => a.actionId));
      }
    }
  }, [showWarnings, statementId]);

  const preSuggestions = useMemo(
    () => territoryData && Object.values(territoryData.entities),
    [territoryData]
  );

  return (
    <>
      <React.Fragment key={statement.id}>
        <StyledEditorPreSection>
          <StyledEditorStatementInfo>
            <StyledHeaderTagWrap>
              <EntityTag entity={statement} fullWidth />
              <div style={{ marginLeft: "0.5rem", marginRight: "0.5rem" }}>
                <Button
                  inverted
                  tooltipLabel="copy statement ID"
                  color="primary"
                  label=""
                  icon={<FaRegCopy />}
                  onClick={async () => {
                    await navigator.clipboard.writeText(statement.id);
                    toast.info("ID copied to clipboard");
                  }}
                />
              </div>
            </StyledHeaderTagWrap>
            {userCanEdit && (
              <div style={{ display: "flex" }}>
                <StyledEditorStatementInfoLabel>
                  change statement label:
                </StyledEditorStatementInfoLabel>
                <StyledEditorHeaderInputWrap>
                  <Input
                    type="text"
                    value={statement.labels[0] || ""}
                    onChangeFn={(newValue: string) => {
                      handleAttributeChange(
                        {
                          labels: statement.labels
                            ? [newValue, ...statement.labels.slice(1)]
                            : [],
                        },
                        true
                      );
                    }}
                  />
                </StyledEditorHeaderInputWrap>
              </div>
            )}
          </StyledEditorStatementInfo>
          {!statement.isTemplate && (
            <StyledBreadcrumbWrap>
              {territoryPath &&
                territoryPath.map((territory: string, key: number) => {
                  return (
                    <React.Fragment key={key}>
                      <BreadcrumbItem territoryId={territory} />
                    </React.Fragment>
                  );
                })}
              {territoryData ? (
                <React.Fragment key={territoryData.id}>
                  <BreadcrumbItem
                    territoryId={territoryData.id}
                    territoryData={territoryData}
                  />
                </React.Fragment>
              ) : (
                <>
                  {!isFetchingTerritory && (
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <AiOutlineWarning
                        size={22}
                        color={themeContext?.color.warning}
                      />
                      <StyledMissingTerritory>
                        {"missing territory"}
                      </StyledMissingTerritory>
                    </div>
                  )}
                </>
              )}
            </StyledBreadcrumbWrap>
          )}
        </StyledEditorPreSection>

        {userCanEdit && !statement.isTemplate && (
          <StyledEditorPreSection>
            {"Move to territory: "}
            <EntitySuggester
              disableTemplatesAccept
              filterEditorRights
              inputWidth={96}
              disableCreate
              categoryTypes={[EntityEnums.Class.Territory]}
              onSelected={(newSelectedId: string) => {
                moveStatementMutation.mutate(newSelectedId);
              }}
            />
          </StyledEditorPreSection>
        )}
        {userCanEdit && (
          <StyledEditorTemplateSection>
            <StyledEditorContentRow>
              <StyledEditorContentRowLabel>
                Apply Template
              </StyledEditorContentRowLabel>
              <StyledEditorContentRowValue>
                <Dropdown.Single.Basic
                  placeholder="select template.."
                  disabled={!userCanEdit || templateOptions.length === 0}
                  width="full"
                  value={null}
                  options={templateOptions}
                  onChange={(templateToApply) => {
                    handleAskForTemplateApply(templateToApply);
                  }}
                />
              </StyledEditorContentRowValue>
            </StyledEditorContentRow>
          </StyledEditorTemplateSection>
        )}

        <StyledEditorSection
          $firstSection
          key="editor-section-summary"
          $marginRight
        >
          <StyledEditorSectionContent $firstSection>
            <Input
              type="textarea"
              rows={5}
              disabled={!userCanEdit}
              width="full"
              noBorder
              placeholder="Insert statement text here"
              onChangeFn={(newValue: string) => {
                if (newValue !== statement.data.text) {
                  handleDataAttributeChange({ text: newValue }, true);
                }
              }}
              value={statement.data.text}
            />
          </StyledEditorSectionContent>
        </StyledEditorSection>

        {statement.warnings.length > 0 && (
          <StyledEditorSection>
            <StyledEditorSectionHeader>
              <StyledEditorSectionHeading>
                {statement.warnings.length} Warnings{" "}
                {statement.warnings.length > 0 && (
                  <TiWarningOutline size={16} style={{ marginLeft: "3px" }} />
                )}
              </StyledEditorSectionHeading>
              <Button
                iconRight={
                  showWarnings ? <AiOutlineCaretUp /> : <AiOutlineCaretDown />
                }
                label={showWarnings ? "hide warnings" : "show warnings"}
                onClick={() => dispatch(setShowWarnings(!showWarnings))}
                color="warning"
                tooltipPosition="right"
              />
            </StyledEditorSectionHeader>
            <StyledEditorSectionContent>
              <StyledDetailWarnings>
                {showWarnings &&
                  statement.warnings
                    .sort((a, b) => a.type.localeCompare(b.type))
                    .map((warning, key) => {
                      return (
                        <Message
                          key={key}
                          warning={warning}
                          entities={statement.entities}
                        />
                      );
                    })}
              </StyledDetailWarnings>
            </StyledEditorSectionContent>
          </StyledEditorSection>
        )}

        {/* Actions */}
        <StyledEditorSection
          $metaSection
          key="editor-section-actions"
          id="action-section"
        >
          <StyledEditorSectionHeader>
            <StyledEditorSectionHeading>Actions</StyledEditorSectionHeading>

            {userCanEdit && (
              <StatementEditorSectionButtons
                section="actions"
                statement={statement}
                previousStatement={previousStatement}
                setShowSubmitSection={setShowSubmitSection}
                handleAttributeChange={handleAttributeChange}
                handleDataAttributeChange={handleDataAttributeChange}
              />
            )}
          </StyledEditorSectionHeader>
          <StyledEditorSectionContent>
            <StatementEditorActionTable
              userCanEdit={userCanEdit}
              statement={statement}
              addProp={addProp}
              updateProp={updateProp}
              removeProp={removeProp}
              movePropToIndex={movePropToIndex}
              territoryParentId={statementTerritoryId}
              territoryActants={territoryActants}
              handleDataAttributeChange={handleDataAttributeChange}
            />
            {userCanEdit && (
              <EntitySuggester
                territoryActants={territoryActants}
                openDetailOnCreate
                onSelected={(newSelectedId: string) => {
                  addAction(newSelectedId);
                }}
                categoryTypes={[EntityEnums.Class.Action]}
                excludedEntityClasses={excludedSuggesterEntities}
                placeholder={"add action"}
                isInsideTemplate={statement.isTemplate}
                territoryParentId={statementTerritoryId}
                preSuggestions={preSuggestions}
              />
            )}
          </StyledEditorSectionContent>
        </StyledEditorSection>

        {/* Actants */}
        <StyledEditorSection
          $metaSection
          key="editor-section-actants"
          id="actant-section"
        >
          <StyledEditorSectionHeader>
            <StyledEditorSectionHeading>Actants</StyledEditorSectionHeading>

            {userCanEdit && (
              <StatementEditorSectionButtons
                section="actants"
                statement={statement}
                previousStatement={previousStatement}
                setShowSubmitSection={setShowSubmitSection}
                handleAttributeChange={handleAttributeChange}
                handleDataAttributeChange={handleDataAttributeChange}
              />
            )}
          </StyledEditorSectionHeader>
          <StyledEditorSectionContent>
            <StatementEditorActantTable
              statement={statement}
              userCanEdit={userCanEdit}
              classEntitiesActant={classesEditorActants}
              addProp={addProp}
              updateProp={updateProp}
              removeProp={removeProp}
              movePropToIndex={movePropToIndex}
              territoryParentId={statementTerritoryId}
              addClassification={addClassification}
              addIdentification={addIdentification}
              territoryActants={territoryActants}
              handleDataAttributeChange={handleDataAttributeChange}
            />
            {userCanEdit && (
              <EntitySuggester
                territoryActants={territoryActants}
                openDetailOnCreate
                onSelected={addActant}
                categoryTypes={classesEditorActants}
                placeholder={"add actant"}
                excludedEntityClasses={excludedSuggesterEntities}
                isInsideTemplate={statement.isTemplate}
                territoryParentId={statementTerritoryId}
                isInsideStatement
                preSuggestions={preSuggestions}
              />
            )}
          </StyledEditorSectionContent>
        </StyledEditorSection>

        {/* Refs */}
        <StyledEditorSection key="editor-section-refs">
          <StyledEditorSectionHeader>
            <StyledEditorSectionHeading>References</StyledEditorSectionHeading>

            {userCanEdit && (
              <StatementEditorSectionButtons
                section="references"
                statement={statement}
                previousStatement={previousStatement}
                setShowSubmitSection={setShowSubmitSection}
                handleAttributeChange={handleAttributeChange}
                handleDataAttributeChange={handleDataAttributeChange}
              />
            )}
          </StyledEditorSectionHeader>
          <StyledEditorSectionContent>
            <EntityReferenceTable
              openDetailOnCreate
              references={statement.references}
              onChange={(
                newReferences: IReference[],
                instantUpdate?: boolean
              ) => {
                handleAttributeChange(
                  { references: newReferences },
                  instantUpdate
                );
              }}
              disabled={!userCanEdit}
              isInsideTemplate={statement.isTemplate || false}
              territoryParentId={statementTerritoryId}
              entities={statement.entities ?? {}}
              entityId={statement.id}
              userCanEdit={userCanEdit}
            />
          </StyledEditorSectionContent>
        </StyledEditorSection>

        {/* Tags */}
        <StyledEditorSection key="editor-section-tags">
          <StyledEditorSectionHeader>
            <StyledEditorSectionHeading>Tags</StyledEditorSectionHeading>
          </StyledEditorSectionHeader>

          <StyledEditorSectionContent>
            <StyledTagsList $paddingBottom={statement.data.tags.length > 0}>
              {statement.data.tags.map((tag: string, key: number) => {
                const tagActant = statement?.entities[tag];
                return (
                  tagActant && (
                    <StyledTagsListItem key={key}>
                      <EntityTag
                        entity={tagActant}
                        fullWidth
                        tooltipPosition="left"
                        unlinkButton={
                          userCanEdit && {
                            onClick: () => {
                              removeTag(tag);
                            },
                          }
                        }
                      />
                    </StyledTagsListItem>
                  )
                );
              })}
            </StyledTagsList>
            {userCanEdit && (
              <EntitySuggester
                territoryActants={territoryActants}
                openDetailOnCreate
                onSelected={(newSelectedId: string) => {
                  if (!statement.data.tags.find((t) => t === newSelectedId)) {
                    addTag(newSelectedId);
                  } else {
                    toast.info("Tag already added");
                  }
                }}
                disableTemplatesAccept
                categoryTypes={classesEditorTags}
                placeholder={"add new tag"}
                excludedEntityClasses={excludedSuggesterEntities}
                excludedActantIds={statement.data.tags}
                isInsideTemplate={statement.isTemplate}
                territoryParentId={statementTerritoryId}
                preSuggestions={preSuggestions}
              />
            )}
          </StyledEditorSectionContent>
        </StyledEditorSection>

        {/* Notes */}
        <StyledEditorSection key="editor-section-notes" $lastSection>
          <StyledEditorSectionHeader>Notes</StyledEditorSectionHeader>
          <StyledEditorSectionContent>
            <MultiInput
              width="full"
              disabled={!userCanEdit}
              values={statement.notes}
              onChange={(newValues: string[]) => {
                handleAttributeChange({ notes: newValues });
              }}
            />
          </StyledEditorSectionContent>
        </StyledEditorSection>

        {/* Audits */}
        <StyledEditorSection key="editor-section-audits">
          <StyledEditorSectionHeader>Audits</StyledEditorSectionHeader>
          <StyledEditorSectionContent>
            {audit && <AuditTable {...audit} />}
          </StyledEditorSectionContent>
        </StyledEditorSection>

        {/* JSON */}
        <StyledEditorSection key="editor-section-json">
          <StyledEditorSectionHeader>JSON</StyledEditorSectionHeader>
          <StyledEditorSectionContent>
            {statement && <JSONExplorer data={statement} />}
          </StyledEditorSectionContent>
        </StyledEditorSection>
      </React.Fragment>

      {templateToApply && (
        <ApplyTemplateModal
          showModal={showApplyTemplateModal}
          setShowApplyTemplateModal={setShowApplyTemplateModal}
          updateEntityMutation={updateStatementMutation}
          templateToApply={templateToApply}
          setTemplateToApply={setTemplateToApply}
          entity={statement}
        />
      )}

      <Submit
        show={showSubmitSection !== false}
        text={`Do you really want to remove all ${showSubmitSection} from this statement?`}
        title={`Remove ${showSubmitSection}`}
        onSubmit={() => {
          if (showSubmitSection === "references") {
            handleAttributeChange({ references: [] });
          } else if (showSubmitSection !== false) {
            handleDataAttributeChange({ [showSubmitSection]: [] });
          }
          setShowSubmitSection(false);
        }}
        loading={updateStatementMutation.isPending}
        onCancel={() => setShowSubmitSection(false)}
      />
    </>
  );
};
