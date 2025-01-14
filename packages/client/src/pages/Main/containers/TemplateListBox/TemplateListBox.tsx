import { entitiesDict } from "@shared/dictionaries";
import { EntityEnums, UserEnums } from "@shared/enums";
import { IEntity } from "@shared/types";
import { IRequestSearch } from "@shared/types/request-search";
import api from "api";
import { Button, Input, Loader, TypeBar } from "components";

import { useQuery } from "@tanstack/react-query";
import Dropdown, { EntityTag } from "components/advanced";
import React, { useMemo, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { useAppSelector } from "redux/hooks";
import {
  StyledBoxContent,
  StyledTemplateFilter,
  StyledTemplateFilterInputLabel,
  StyledTemplateFilterInputRow,
  StyledTemplateFilterInputValue,
  StyledTemplateSection,
  StyledTemplateSectionHeader,
  StyledTemplateSectionList,
} from "./TemplateListBoxStyles";
import { TemplateListCreateModal } from "./TemplateListCreateModal/TemplateListCreateModal";
import { TemplateListRemoveModal } from "./TemplateListRemoveModal/TemplateListRemoveModal";

interface TemplateListBox {}
export const TemplateListBox: React.FC<TemplateListBox> = () => {
  // FILTER;
  const allEntityOption = {
    value: EntityEnums.Extension.Any,
    label: "all",
  } as { value: EntityEnums.Extension.Any; label: string };
  const allEntityOptions = [allEntityOption, ...entitiesDict];

  const [filterByClass, setFilterByClass] = useState<
    EntityEnums.Class | EntityEnums.Extension.Any
  >(EntityEnums.Extension.Any);
  const [filterByLabel, setFilterByLabel] = useState<string>("");

  const fourthPanelBoxesOpened: { [key: string]: boolean } = useAppSelector(
    (state) => state.layout.fourthPanelBoxesOpened
  );

  const {
    status,
    data: templatesData = [],
    error,
    isFetching: isFetchingTemplates,
  } = useQuery({
    queryKey: ["templates", filterByClass, filterByLabel],
    queryFn: async () => {
      const filters: IRequestSearch = {
        onlyTemplates: true,
      };
      if (filterByClass !== allEntityOption.value) {
        filters.class = filterByClass as EntityEnums.Class;
      }
      if (filterByLabel.length) {
        filters.label = filterByLabel + "*";
      }

      const res = await api.entitiesSearch(filters);

      const templates = res.data;
      templates.sort((a: IEntity, b: IEntity) =>
        a.labels[0].toLocaleLowerCase() > b.labels[0].toLocaleLowerCase()
          ? 1
          : -1
      );
      return templates;
    },
    enabled: api.isLoggedIn() && fourthPanelBoxesOpened["templates"],
  });

  // CREATE MODAL
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const handleAskCreateTemplate = () => {
    setShowCreateModal(true);
  };

  // REMOVE MODAL
  const [removeEntityId, setRemoveEntityId] = useState<string | false>(false);

  const handleAskRemoveTemplate = (templateId: string) => {
    setRemoveEntityId(templateId);
  };

  const entityToRemove: false | IEntity = useMemo(() => {
    if (removeEntityId) {
      const templateToBeRemoved = templatesData?.find(
        (template: IEntity) => template.id === removeEntityId
      );
      return templateToBeRemoved || false;
    } else {
      return false;
    }
  }, [removeEntityId]);

  const userRole = localStorage.getItem("userrole") as UserEnums.Role;

  return (
    <StyledBoxContent>
      <StyledTemplateSection>
        <StyledTemplateSectionHeader>
          {userRole !== UserEnums.Role.Viewer && (
            <Button
              key="add-template"
              icon={<FaPlus />}
              color="primary"
              label="new Template"
              onClick={() => {
                handleAskCreateTemplate();
              }}
            />
          )}
        </StyledTemplateSectionHeader>

        <StyledTemplateFilter>
          <StyledTemplateFilterInputRow>
            <StyledTemplateFilterInputLabel>
              {"Entity class: "}
            </StyledTemplateFilterInputLabel>
            <StyledTemplateFilterInputValue>
              <div style={{ position: "relative" }}>
                <Dropdown.Single.Entity
                  value={filterByClass}
                  options={allEntityOptions}
                  onChange={(selectedOption) => {
                    setFilterByClass(selectedOption);
                  }}
                  width="full"
                  disableTyping
                />
                <TypeBar entityLetter={filterByClass} />
              </div>
            </StyledTemplateFilterInputValue>
          </StyledTemplateFilterInputRow>
          <StyledTemplateFilterInputRow>
            <StyledTemplateFilterInputLabel>
              {"Label: "}
            </StyledTemplateFilterInputLabel>
            <StyledTemplateFilterInputValue>
              <Input
                value={filterByLabel}
                onChangeFn={(newType: string) => setFilterByLabel(newType)}
                changeOnType
                width="full"
                autoFocus
              />
            </StyledTemplateFilterInputValue>
          </StyledTemplateFilterInputRow>
        </StyledTemplateFilter>
        <StyledTemplateSectionList>
          {templatesData &&
            templatesData.map((templateEntity, ti) => {
              return (
                <React.Fragment key={templateEntity.id + ti}>
                  <EntityTag
                    entity={templateEntity}
                    fullWidth
                    tooltipPosition="left"
                    unlinkButton={
                      userRole !== UserEnums.Role.Viewer && {
                        onClick: () => {
                          handleAskRemoveTemplate(templateEntity.id);
                        },
                        tooltipLabel: "delete template",
                        icon: <FaTrash />,
                      }
                    }
                  />
                </React.Fragment>
              );
            })}
          <Loader show={isFetchingTemplates} size={40} />
        </StyledTemplateSectionList>
      </StyledTemplateSection>

      <TemplateListCreateModal
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
      />
      {removeEntityId && (
        <TemplateListRemoveModal
          removeEntityId={removeEntityId}
          setRemoveEntityId={setRemoveEntityId}
          entityToRemove={entityToRemove}
        />
      )}
    </StyledBoxContent>
  );
};

export const MemoizedTemplateListBox = React.memo(TemplateListBox);
