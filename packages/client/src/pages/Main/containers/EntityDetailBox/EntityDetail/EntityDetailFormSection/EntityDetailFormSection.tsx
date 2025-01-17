import {
  actantLogicalTypeDict,
  actionPartOfSpeechDict,
  conceptPartOfSpeechDict,
  entitiesDictKeys,
  entityStatusDict,
  languageDict,
} from "@shared/dictionaries";
import { EntityEnums } from "@shared/enums";
import {
  IActionData,
  IEntity,
  IResponseDetail,
  IResponseGeneric,
} from "@shared/types";
import { IConceptData } from "@shared/types/concept";
import { UseMutationResult, useQuery } from "@tanstack/react-query";
import { MIN_LABEL_LENGTH_MESSAGE, rootTerritoryId } from "Theme/constants";
import api from "api";
import { AxiosResponse } from "axios";
import { Button, Input, MultiInput, TypeBar } from "components";
import Dropdown, { AttributeButtonGroup, EntityTag } from "components/advanced";
import React, { useEffect, useMemo, useState } from "react";
import { FaExternalLinkAlt, FaPlus, FaRegCopy } from "react-icons/fa";
import { toast } from "react-toastify";
import { DropdownItem } from "types";
import {
  StyledDetailContentRow,
  StyledDetailContentRowLabel,
  StyledDetailContentRowValue,
  StyledDetailContentRowValueID,
  StyledDetailForm,
  StyledFormWrapper,
  StyledRelativePosition,
  StyledTagWrap,
} from "../EntityDetailStyles";
import {
  StyledAddLabel,
  StyledAlternativeLabel,
  StyledAlternativeLabels,
  StyledAlternativeLabelWrap,
  StyledCloseIcon,
  StyledGreyBar,
} from "./EntityDetailFormSectionStyles";

interface EntityDetailFormSection {
  entity: IResponseDetail;
  userCanEdit: boolean;
  updateEntityMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    Partial<IEntity>,
    unknown
  >;
  actantMode: string;
  userCanAdmin: boolean;
  isClassChangeable: boolean;
  allowedEntityChangeClasses: EntityEnums.Class[];
  templateOptions: DropdownItem[];
  setSelectedEntityType: (
    value: React.SetStateAction<EntityEnums.Class | undefined>
  ) => void;
  setShowTypeSubmit: (value: React.SetStateAction<boolean>) => void;
  handleAskForTemplateApply: (templateIdToApply: string) => void;
  isTerritoryWithParent: (entity: IResponseDetail) => boolean;
  isStatementWithTerritory: (entity: IResponseDetail) => boolean;
}
export const EntityDetailFormSection: React.FC<EntityDetailFormSection> = ({
  entity,
  userCanEdit,
  updateEntityMutation,
  actantMode,
  userCanAdmin,
  isClassChangeable,
  allowedEntityChangeClasses,
  templateOptions,
  setSelectedEntityType,
  setShowTypeSubmit,
  handleAskForTemplateApply,
  isTerritoryWithParent,
  isStatementWithTerritory,
}) => {
  const { status: documentsStatus, data: documents } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await api.documentsGet({});
      return res.data;
    },
    enabled: actantMode === "resource" && api.isLoggedIn(),
  });

  const noDocumentLinkedItem: DropdownItem = {
    value: "",
    label: "no document linked",
  };
  const documentOptions: DropdownItem[] = useMemo(() => {
    const options = [noDocumentLinkedItem];
    documents?.forEach((doc) => {
      options.push({
        value: doc.id,
        label: doc.title,
      });
    });
    return options;
  }, [documents]);

  const selectedDocumentOption: string = useMemo(() => {
    return entity.data.documentId ?? noDocumentLinkedItem.value;
  }, [documentOptions, entity.data.documentId]);

  const [newLabel, setNewLabel] = useState<string>(entity.labels[0]);

  useEffect(() => {
    setNewLabel(entity.labels[0]);
  }, [entity.labels[0]]);

  const [newAltLabel, setNewAltLabel] = useState("");
  const [currentlyEditedAltLabel, setCurrentlyEditedAltLabel] = useState<
    false | number
  >(false);
  const alternativeLabels = entity.labels.slice(1);

  return (
    <>
      <StyledFormWrapper>
        <StyledDetailForm>
          <StyledDetailContentRow>
            <StyledDetailContentRowLabel>ID</StyledDetailContentRowLabel>
            <StyledDetailContentRowValue>
              <StyledDetailContentRowValueID>
                {entity.id}
                <Button
                  inverted
                  tooltipLabel="copy ID"
                  color="primary"
                  label=""
                  icon={<FaRegCopy />}
                  onClick={async () => {
                    await navigator.clipboard.writeText(entity.id);
                    toast.info("ID copied to clipboard");
                  }}
                />
              </StyledDetailContentRowValueID>
            </StyledDetailContentRowValue>
          </StyledDetailContentRow>

          {/* Entity type */}
          {isClassChangeable && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Entity Type
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <StyledRelativePosition>
                  <Dropdown.Single.Entity
                    value={entity.class}
                    options={allowedEntityChangeClasses.map(
                      (c) => entitiesDictKeys[c]
                    )}
                    onChange={(selectedOption) => {
                      setSelectedEntityType(selectedOption);
                      setShowTypeSubmit(true);
                    }}
                    width={200}
                    disableTyping
                  />
                  <TypeBar entityLetter={entity.class} />
                </StyledRelativePosition>
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}

          {/* templates */}
          <StyledDetailContentRow>
            <StyledDetailContentRowLabel>
              Apply Template
            </StyledDetailContentRowLabel>
            <StyledDetailContentRowValue>
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
            </StyledDetailContentRowValue>
          </StyledDetailContentRow>

          {entity.usedTemplate && entity.usedTemplate in entity.entities && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Applied Template
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <StyledTagWrap>
                  <EntityTag
                    entity={entity.entities[entity.usedTemplate]}
                    fullWidth
                  />
                </StyledTagWrap>
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}

          {entity.legacyId && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Legacy ID
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <StyledDetailContentRowValueID>
                  {entity.legacyId}
                </StyledDetailContentRowValueID>
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}

          {/* Label */}
          <StyledDetailContentRow>
            <StyledDetailContentRowLabel>Label</StyledDetailContentRowLabel>
            <StyledDetailContentRowValue>
              <Input
                disabled={!userCanEdit}
                changeOnType
                width="full"
                value={newLabel}
                onChangeFn={(newLabel: string) => setNewLabel(newLabel)}
                onBlur={() => {
                  if (
                    entity.class !== EntityEnums.Class.Statement &&
                    newLabel.length < 1
                  ) {
                    toast.info(MIN_LABEL_LENGTH_MESSAGE);
                    setNewLabel(entity.labels[0]);
                  } else {
                    if (newLabel !== entity.labels[0]) {
                      updateEntityMutation.mutate({
                        labels: [newLabel, ...entity.labels.slice(1)],
                      });
                    }
                  }
                }}
              />
            </StyledDetailContentRowValue>
          </StyledDetailContentRow>
          <StyledDetailContentRow>
            <StyledDetailContentRowLabel>Detail</StyledDetailContentRowLabel>
            <StyledDetailContentRowValue>
              <Input
                disabled={!userCanEdit}
                width="full"
                type="textarea"
                value={entity.detail}
                onChangeFn={async (newValue: string) => {
                  if (newValue !== entity.detail)
                    updateEntityMutation.mutate({ detail: newValue });
                }}
              />
            </StyledDetailContentRowValue>
          </StyledDetailContentRow>

          {/* territory parent */}
          {isTerritoryWithParent(entity) && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Parent Territory
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <StyledTagWrap>
                  <EntityTag
                    fullWidth
                    entity={entity.entities[entity.data.parent.territoryId]}
                    disableDoubleClick={
                      entity.data.parent.territoryId === rootTerritoryId
                    }
                    disableDrag={
                      entity.data.parent.territoryId === rootTerritoryId
                    }
                    disableTooltip={
                      entity.data.parent.territoryId === rootTerritoryId
                    }
                  />
                </StyledTagWrap>
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}

          {/* statement terriroty */}
          {isStatementWithTerritory(entity) && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Territory
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <EntityTag
                  entity={entity.entities[entity.data.territory.territoryId]}
                />
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}
          <StyledDetailContentRow>
            <StyledDetailContentRowLabel>Status</StyledDetailContentRowLabel>
            <StyledDetailContentRowValue>
              <AttributeButtonGroup
                noMargin
                disabled={!userCanAdmin}
                options={entityStatusDict.map((entityStatusOption) => {
                  return {
                    longValue: entityStatusOption["label"],
                    shortValue: entityStatusOption["label"],
                    onClick: () => {
                      updateEntityMutation.mutate({
                        status: entityStatusOption["value"],
                      });
                    },
                    selected: entityStatusOption["value"] === entity.status,
                  };
                })}
              />
            </StyledDetailContentRowValue>
          </StyledDetailContentRow>

          <StyledDetailContentRow>
            <StyledDetailContentRowLabel>
              Label language
            </StyledDetailContentRowLabel>
            <StyledDetailContentRowValue>
              <Dropdown.Single.Basic
                disabled={!userCanEdit}
                width="full"
                options={languageDict}
                value={entity.language}
                onChange={(selectedOption) => {
                  updateEntityMutation.mutate({
                    language: selectedOption || EntityEnums.Language.Empty,
                  });
                }}
              />
            </StyledDetailContentRowValue>
          </StyledDetailContentRow>

          {/* part of speech */}

          {entity.class === EntityEnums.Class.Action && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Part of Speech
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <Dropdown.Single.Basic
                  disabled={!userCanEdit}
                  width="full"
                  options={actionPartOfSpeechDict}
                  value={(entity.data as IActionData).pos}
                  onChange={(selectedOption) => {
                    const oldData = { ...entity.data };
                    updateEntityMutation.mutate({
                      data: {
                        ...oldData,
                        ...{
                          pos: selectedOption,
                        },
                      },
                    });
                  }}
                />
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}
          {entity.class === EntityEnums.Class.Concept && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Part of Speech
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <Dropdown.Single.Basic
                  disabled={!userCanEdit}
                  width="full"
                  options={conceptPartOfSpeechDict}
                  value={(entity.data as IConceptData).pos}
                  onChange={(selectedOption) => {
                    const oldData = { ...entity.data };
                    updateEntityMutation.mutate({
                      data: {
                        ...oldData,
                        ...{
                          pos: selectedOption,
                        },
                      },
                    });
                  }}
                />
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}

          {actantMode === "entity" && entity.data?.logicalType && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Logical Type
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <AttributeButtonGroup
                  noMargin
                  disabled={!userCanEdit}
                  options={[
                    {
                      longValue: actantLogicalTypeDict[0]["label"],
                      shortValue: actantLogicalTypeDict[0]["label"],
                      onClick: () => {
                        updateEntityMutation.mutate({
                          data: {
                            logicalType: actantLogicalTypeDict[0]["value"],
                          },
                        });
                      },
                      selected:
                        actantLogicalTypeDict[0]["value"] ===
                        entity.data.logicalType,
                    },
                    {
                      longValue: actantLogicalTypeDict[1]["label"],
                      shortValue: actantLogicalTypeDict[1]["label"],
                      onClick: () => {
                        updateEntityMutation.mutate({
                          data: {
                            logicalType: actantLogicalTypeDict[1]["value"],
                          },
                        });
                      },
                      selected:
                        actantLogicalTypeDict[1]["value"] ===
                        entity.data.logicalType,
                    },
                    {
                      longValue: actantLogicalTypeDict[2]["label"],
                      shortValue: actantLogicalTypeDict[2]["label"],
                      onClick: () => {
                        updateEntityMutation.mutate({
                          data: {
                            logicalType: actantLogicalTypeDict[2]["value"],
                          },
                        });
                      },
                      selected:
                        actantLogicalTypeDict[2]["value"] ===
                        entity.data.logicalType,
                    },
                    {
                      longValue: actantLogicalTypeDict[3]["label"],
                      shortValue: actantLogicalTypeDict[3]["label"],
                      onClick: () => {
                        updateEntityMutation.mutate({
                          data: {
                            logicalType: actantLogicalTypeDict[3]["value"],
                          },
                        });
                      },
                      selected:
                        actantLogicalTypeDict[3]["value"] ===
                        entity.data.logicalType,
                    },
                  ]}
                />
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}

          {actantMode === "resource" && (
            <React.Fragment>
              <StyledDetailContentRow>
                <StyledDetailContentRowLabel>URL</StyledDetailContentRowLabel>
                <StyledDetailContentRowValue>
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <Input
                      disabled={!userCanEdit}
                      value={entity.data.url}
                      width="full"
                      onChangeFn={async (newValue: string) => {
                        const oldData = { ...entity.data };
                        updateEntityMutation.mutate({
                          data: {
                            ...oldData,
                            ...{
                              url: newValue,
                            },
                          },
                        });
                      }}
                    />
                    <div>
                      <Button
                        icon={<FaExternalLinkAlt />}
                        onClick={() => window.open(entity.data.url, "_blank")}
                        inverted
                        disabled={!entity.data.url}
                        tooltipLabel="open in new tab"
                      />
                    </div>
                  </span>
                </StyledDetailContentRowValue>
              </StyledDetailContentRow>

              <StyledDetailContentRow>
                <StyledDetailContentRowLabel>
                  Base URL
                </StyledDetailContentRowLabel>
                <StyledDetailContentRowValue>
                  <Input
                    disabled={!userCanEdit}
                    value={entity.data.partValueBaseURL}
                    width="full"
                    onChangeFn={async (newValue: string) => {
                      const oldData = { ...entity.data };
                      updateEntityMutation.mutate({
                        data: {
                          ...oldData,
                          ...{
                            partValueBaseURL: newValue,
                          },
                        },
                      });
                    }}
                  />
                </StyledDetailContentRowValue>
              </StyledDetailContentRow>

              <StyledDetailContentRow>
                <StyledDetailContentRowLabel>
                  Part Label
                </StyledDetailContentRowLabel>
                <StyledDetailContentRowValue>
                  <Input
                    disabled={!userCanEdit}
                    value={entity.data.partValueLabel}
                    width="full"
                    onChangeFn={async (newValue: string) => {
                      const oldData = { ...entity.data };
                      updateEntityMutation.mutate({
                        data: {
                          ...oldData,
                          ...{
                            partValueLabel: newValue,
                          },
                        },
                      });
                    }}
                  />
                </StyledDetailContentRowValue>
              </StyledDetailContentRow>

              {/* document id */}
              <StyledDetailContentRow>
                <StyledDetailContentRowLabel>
                  Linked Document
                </StyledDetailContentRowLabel>
                <StyledDetailContentRowValue>
                  <Dropdown.Single.Basic
                    disabled={!userCanEdit}
                    value={selectedDocumentOption}
                    width="full"
                    options={documentOptions}
                    onChange={(selectedOption) => {
                      const oldData = { ...entity.data };
                      updateEntityMutation.mutate({
                        data: {
                          ...oldData,
                          ...{
                            documentId: selectedOption,
                          },
                        },
                      });
                    }}
                  />
                </StyledDetailContentRowValue>
              </StyledDetailContentRow>
            </React.Fragment>
          )}

          <StyledDetailContentRow>
            <br />
          </StyledDetailContentRow>

          <StyledDetailContentRow>
            <StyledDetailContentRowLabel>Notes</StyledDetailContentRowLabel>
            <StyledDetailContentRowValue>
              <MultiInput
                disabled={!userCanEdit}
                values={entity.notes}
                width="full"
                onChange={(newValues: string[]) => {
                  updateEntityMutation.mutate({ notes: newValues });
                }}
              />
            </StyledDetailContentRowValue>
          </StyledDetailContentRow>

          <StyledDetailContentRow>
            <br />
          </StyledDetailContentRow>

          {entity.class !== EntityEnums.Class.Statement && (
            <StyledDetailContentRow>
              <StyledDetailContentRowLabel>
                Alternative labels
              </StyledDetailContentRowLabel>
              <StyledDetailContentRowValue>
                <StyledAlternativeLabels>
                  {alternativeLabels.map((label, key) => {
                    return (
                      <StyledAlternativeLabelWrap key={key}>
                        <StyledGreyBar />
                        <StyledAlternativeLabel
                          onClick={() => setCurrentlyEditedAltLabel(key)}
                        >
                          {currentlyEditedAltLabel === key ? (
                            <Input
                              autoFocus
                              value={label}
                              onChangeFn={(value) => {
                                updateEntityMutation.mutate({
                                  labels: [
                                    newLabel,
                                    ...alternativeLabels.map((label, index) =>
                                      index === key ? value : label
                                    ),
                                  ],
                                });
                              }}
                              onBlur={() => {
                                setCurrentlyEditedAltLabel(false);
                              }}
                            />
                          ) : (
                            <>{label}</>
                          )}
                        </StyledAlternativeLabel>

                        <div>
                          <StyledCloseIcon
                            size={14}
                            onClick={() => {
                              updateEntityMutation.mutate({
                                labels: entity.labels.filter(
                                  (l) => l !== label
                                ),
                              });
                            }}
                          />
                        </div>
                      </StyledAlternativeLabelWrap>
                    );
                  })}
                </StyledAlternativeLabels>

                <StyledAddLabel $marginTop={entity.labels.length > 1}>
                  <Input
                    width="full"
                    placeholder="add label"
                    disabled={!userCanEdit}
                    changeOnType
                    value={newAltLabel}
                    onChangeFn={(newLabel: string) => setNewAltLabel(newLabel)}
                    onEnterPressFn={() => {
                      updateEntityMutation.mutate({
                        labels: [...entity.labels, newAltLabel],
                      });
                      setNewAltLabel("");
                    }}
                  />
                  <span>
                    <Button
                      disabled={
                        newAltLabel.length === 0 ||
                        entity.labels.includes(newAltLabel)
                      }
                      color="black"
                      icon={<FaPlus />}
                      onClick={() => {
                        updateEntityMutation.mutate({
                          labels: [...entity.labels, newAltLabel],
                        });
                        setNewAltLabel("");
                      }}
                    />
                  </span>
                </StyledAddLabel>
              </StyledDetailContentRowValue>
            </StyledDetailContentRow>
          )}
        </StyledDetailForm>
      </StyledFormWrapper>
    </>
  );
};
