import { animated, config, useSpring } from "@react-spring/web";
import { entityStatusDict, languageDict } from "@shared/dictionaries";
import { entitiesDict } from "@shared/dictionaries/entity";
import { EntityEnums, UserEnums } from "@shared/enums";
import { IEntity } from "@shared/types";
import { IRequestSearch } from "@shared/types/request-search";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { wildCardChar } from "Theme/constants";
import api from "api";
import { Button, Checkbox, Input, Loader, Tooltip, TypeBar } from "components";
import Dropdown, {
  AttributeButtonGroup,
  EntityCreateModal,
  EntitySuggester,
  EntityTag,
} from "components/advanced";
import { useDebounce, useResizeObserver, useSearchParams } from "hooks";
import React, { useEffect, useMemo, useState } from "react";
import { CgOptions } from "react-icons/cg";
import { FaPlus } from "react-icons/fa";
import { IoMdArrowDropdownCircle } from "react-icons/io";
import { RiCloseFill } from "react-icons/ri";
import { DropdownItem } from "types";
import {
  StyledAdvancedOptions,
  StyledAdvancedOptionsSign,
  StyledBoxContent,
  StyledDatePicker,
  StyledDateTag,
  StyledDateTagButton,
  StyledDateTagText,
  StyledOptions,
  StyledResultsHeader,
  StyledResultsWrapper,
  StyledRow,
  StyledRowHeader,
} from "./EntitySearchBoxStyles";
import { EntitySearchResults } from "./EntitySearchResults/EntitySearchResults";

const initSearchValues: IRequestSearch = {
  labelOrId: "",
  cooccurrenceId: "",
};
const defaultClassOption = {
  label: "*",
  value: "" as EntityEnums.Class,
};

const defaultStatusOption = {
  label: "all",
  value: "" as EntityEnums.Status,
};
const statusOptions = [defaultStatusOption].concat(entityStatusDict);

const defaultLanguageOption = {
  label: "all",
  value: "" as EntityEnums.Language,
};
const languageOptions = [defaultLanguageOption].concat(languageDict);

const anyTemplate: DropdownItem = {
  value: "Any",
  label: "Any template",
  info: "",
};

const debounceTime: number = 500;

export const EntitySearchBox: React.FC = () => {
  const queryClient = useQueryClient();
  const { appendDetailId } = useSearchParams();

  const [classOption, setClassOption] = useState<EntityEnums.Class>(
    defaultClassOption.value as EntityEnums.Class
  );
  const [templateOption, setTemplateOption] =
    useState<DropdownItem>(defaultClassOption);
  const [searchData, setSearchData] =
    useState<IRequestSearch>(initSearchValues);
  const debouncedValues = useDebounce<IRequestSearch>(searchData, debounceTime);

  const { ref: resultRef, height: debouncedResultsHeight = 0 } =
    useResizeObserver<HTMLDivElement>();

  const statusOptionSelected: EntityEnums.Status = useMemo(() => {
    if (!!searchData.status) {
      return searchData.status || defaultStatusOption.value;
    }
    return defaultStatusOption.value;
  }, [searchData.status]);

  const languageOptionSelected: EntityEnums.Language = useMemo(() => {
    if (!!searchData.language) {
      return searchData.language || defaultLanguageOption.value;
    }
    return defaultLanguageOption.value;
  }, [searchData.language]);

  // check whether the search should be executed
  const validSearch = useMemo(() => {
    return (
      Object.values(debouncedValues).filter((searchValue: any) => searchValue)
        .length > 0
    );
  }, [debouncedValues]);

  const {
    status,
    data: entities,
    error,
    isFetching,
    isPending,
  } = useQuery({
    queryKey: ["search", { searchData: JSON.stringify(debouncedValues) }],
    queryFn: async () => {
      if (debouncedValues.usedTemplate === "Any") {
        const { usedTemplate, ...filters } = debouncedValues;
        filters.onlyTemplates = true;
        const res = await api.entitiesSearch(filters);
        return res.data;
      }
      const labelWithWildCard =
        debouncedValues.labelOrId && debouncedValues.labelOrId?.length > 0
          ? debouncedValues.labelOrId + wildCardChar
          : debouncedValues.labelOrId;

      const res = await api.entitiesSearch({
        ...debouncedValues,
        labelOrId: labelWithWildCard,
      });
      return res.data;
    },
    enabled: api.isLoggedIn() && validSearch,
  });

  const [territoryEntity, setTerritoryEntity] = useState<IEntity | false>(
    false
  );
  const [cooccurrenceEntity, setCooccurrenceEntity] = useState<IEntity | false>(
    false
  );
  const [referencedTo, setReferencedTo] = useState<IEntity | false>(false);

  // apply changes to search parameters
  const handleChange = (changes: {
    [key: string]:
      | string
      | false
      | true
      | undefined
      | DropdownItem
      | Date
      | string[];
  }) => {
    const newSearch = {
      ...searchData,
      ...changes,
    };

    // remove parameters where the value is set to undefined
    Object.keys(changes).forEach((changeKey) => {
      const value = changes[changeKey];
      if (value === undefined) {
        delete changes[changeKey];
      }
    });

    if (changes.isRootInvalid === false) {
      delete newSearch.isRootInvalid;
    }

    setSearchData(newSearch);
  };

  // sort found entities by label
  const sortedEntities = useMemo(() => {
    if (entities) {
      const sorted = [...entities];
      sorted.sort((a: IEntity, b: IEntity) =>
        a.labels[0].toLocaleLowerCase() > b.labels[0].toLocaleLowerCase()
          ? 1
          : -1
      );
      return entities;
    }
    return [];
  }, [entities]);

  // get all templates for the "limit by template" option
  // const {
  //   status: templateStatus,
  //   data: templates,
  //   error: templateError,
  //   isFetching: isFetchingTemplates,
  // } = useQuery({
  //   queryKey: ["search-templates", searchData, classOption],
  //   queryFn: async () => {
  //     const res = await api.entitiesSearch({
  //       onlyTemplates: true,
  //       class: searchData.class,
  //     });

  //     const templates = res.data;

  //     templates.sort((a: IEntity, b: IEntity) =>
  //       a.label.toLocaleLowerCase() > b.label.toLocaleLowerCase() ? 1 : -1
  //     );
  //     return templates;
  //   },
  //   enabled: api.isLoggedIn(),
  // });

  // RELATED TO UNUSED TEMPLATE DROPDOWN
  // const templateOptions: DropdownItem[] = useMemo(() => {
  //   const options: DropdownItem[] = [anyTemplate];

  //   if (templates) {
  //     templates.forEach((template) => {
  //       if (template.label.length > 20) {
  //         options.push({
  //           value: template.id,
  //           label: template.label.substring(0, 20) + "...",
  //         });
  //       } else {
  //         options.push({
  //           value: template.id,
  //           label: template.label,
  //         });
  //       }
  //     });
  //   }
  //   return options;
  // }, [templates]);

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    if (!showAdvancedOptions) {
      setSearchData({
        labelOrId: searchData.labelOrId,
      });
      setClassOption(defaultClassOption.value as EntityEnums.Class);
    }
  }, [showAdvancedOptions]);

  const [showEntityCreateModal, setShowEntityCreateModal] = useState(false);

  const rotateOptionsIcon = useSpring({
    transform: showAdvancedOptions ? "rotate(180deg)" : "rotate(0deg)",
    config: config.stiff,
  });

  const userRole = localStorage.getItem("userrole");

  return (
    <>
      <StyledBoxContent>
        <StyledOptions>
          <StyledRow>
            <StyledRowHeader>label or uuid</StyledRowHeader>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                width: "100%",
              }}
            >
              <Input
                width="full"
                placeholder="type to search"
                changeOnType
                onChangeFn={(value: string) =>
                  handleChange({ labelOrId: value })
                }
              />
              {userRole !== UserEnums.Role.Viewer && (
                <Button
                  tooltipLabel="create entity"
                  icon={<FaPlus />}
                  onClick={() => setShowEntityCreateModal(true)}
                />
              )}
            </div>
          </StyledRow>

          <StyledAdvancedOptions>
            <div style={{ height: "100%", width: "100%" }}>
              <StyledAdvancedOptionsSign>
                <CgOptions />
                <i>advanced options</i>
              </StyledAdvancedOptionsSign>
            </div>
            <div>
              <Button
                icon={
                  <div style={{ display: "inline-flex", alignItems: "center" }}>
                    <p style={{ margin: "0 0.3rem" }}>
                      {showAdvancedOptions ? "hide" : "show"}
                    </p>
                    <animated.div style={rotateOptionsIcon}>
                      <IoMdArrowDropdownCircle size={16} />
                    </animated.div>
                  </div>
                }
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                inverted
              />
            </div>
          </StyledAdvancedOptions>

          {showAdvancedOptions && (
            <>
              <StyledRow>
                <StyledRowHeader>class</StyledRowHeader>
                <div style={{ position: "relative" }}>
                  <Dropdown.Single.Entity
                    placeholder={""}
                    width="full"
                    options={[defaultClassOption].concat(entitiesDict)}
                    value={classOption}
                    onChange={(selectedOption) => {
                      setClassOption(selectedOption as EntityEnums.Class);
                      setTemplateOption(defaultClassOption);
                      handleChange({
                        class: selectedOption,
                        usedTemplate: defaultClassOption.value,
                      });
                    }}
                  />
                  <TypeBar entityLetter={classOption} />
                </div>
              </StyledRow>

              <StyledRow>
                <StyledRowHeader>status</StyledRowHeader>
                <div style={{ position: "relative" }}>
                  <Dropdown.Single.Basic
                    placeholder={""}
                    width="full"
                    options={statusOptions}
                    value={statusOptionSelected}
                    onChange={(selectedOption) => {
                      handleChange({
                        status: selectedOption,
                      });
                    }}
                  />
                  <TypeBar entityLetter={classOption} />
                </div>
              </StyledRow>
              <StyledRow>
                <StyledRowHeader>language</StyledRowHeader>
                <div style={{ position: "relative" }}>
                  <Dropdown.Single.Basic
                    placeholder={""}
                    width="full"
                    options={languageOptions}
                    value={languageOptionSelected}
                    onChange={(selectedOption) => {
                      handleChange({
                        language: selectedOption,
                      });
                    }}
                  />
                  <TypeBar entityLetter={classOption} />
                </div>
              </StyledRow>
              {/* NOT USED NOW */}
              {/* <StyledRow>
              <StyledRowHeader>template</StyledRowHeader>
               <Dropdown.Single.Attribute
                placeholder={""}
                width="full"
                options={[defaultClassOption].concat(templateOptions)}
                value={templateOption}
                onChange={(selectedOption) => {
                  setTemplateOption(option);
                  handleChange({ usedTemplate: (selectedOption[0]).value });
                }}
              />
            </StyledRow> */}
              <StyledRow>
                <StyledRowHeader>territory</StyledRowHeader>
                {territoryEntity ? (
                  <>
                    {territoryEntity && (
                      <EntityTag
                        entity={territoryEntity}
                        tooltipPosition={"left"}
                        unlinkButton={{
                          onClick: () => {
                            handleChange({
                              territoryId: "",
                              subTerritorySearch: undefined,
                            });
                            setTerritoryEntity(false);
                          },
                          color: "danger",
                          icon: <RiCloseFill />,
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div>
                    <EntitySuggester
                      disableTemplatesAccept
                      categoryTypes={[EntityEnums.Class.Territory]}
                      onPicked={(entity: IEntity) => {
                        handleChange({ territoryId: entity.id });
                        setTerritoryEntity(entity);
                      }}
                      placeholder={"territory"}
                      disableCreate
                      inputWidth="full"
                    />
                  </div>
                )}
              </StyledRow>
              {territoryEntity && (
                <StyledRow>
                  <StyledRowHeader>Territory children</StyledRowHeader>
                  <AttributeButtonGroup
                    options={[
                      {
                        longValue: "included",
                        shortValue: "included",
                        onClick: () => {
                          handleChange({ subTerritorySearch: true });
                        },
                        selected: searchData.subTerritorySearch === true,
                      },
                      {
                        longValue: "not included",
                        shortValue: "not included",
                        onClick: () => {
                          handleChange({ subTerritorySearch: undefined });
                        },
                        selected: searchData.subTerritorySearch !== true,
                      },
                    ]}
                  />
                </StyledRow>
              )}
              <StyledRow>
                <StyledRowHeader>co-occurrence</StyledRowHeader>
                {cooccurrenceEntity ? (
                  <EntityTag
                    entity={cooccurrenceEntity}
                    tooltipPosition="left"
                    unlinkButton={{
                      onClick: () => {
                        handleChange({ cooccurrenceId: "" });
                        setCooccurrenceEntity(false);
                      },
                      color: "danger",
                      icon: <RiCloseFill />,
                    }}
                  />
                ) : (
                  <div>
                    <EntitySuggester
                      disableTemplatesAccept
                      categoryTypes={[
                        EntityEnums.Class.Statement,
                        EntityEnums.Class.Action,
                        EntityEnums.Class.Territory,
                        EntityEnums.Class.Resource,
                        EntityEnums.Class.Person,
                        EntityEnums.Class.Being,
                        EntityEnums.Class.Group,
                        EntityEnums.Class.Object,
                        EntityEnums.Class.Concept,
                        EntityEnums.Class.Location,
                        EntityEnums.Class.Value,
                        EntityEnums.Class.Event,
                      ]}
                      onPicked={(entity: IEntity) => {
                        handleChange({ cooccurrenceId: entity.id });
                        setCooccurrenceEntity(entity);
                      }}
                      placeholder={"entity"}
                      disableCreate
                      inputWidth="full"
                    />
                  </div>
                )}
              </StyledRow>
              <StyledRow>
                <StyledRowHeader>referenced to</StyledRowHeader>
                {referencedTo ? (
                  <EntityTag
                    entity={referencedTo}
                    unlinkButton={{
                      onClick: () => {
                        handleChange({ haveReferenceTo: undefined });
                        setReferencedTo(false);
                      },
                      color: "danger",
                      icon: <RiCloseFill />,
                    }}
                  />
                ) : (
                  <EntitySuggester
                    disableCreate
                    onPicked={(entity) => {
                      setReferencedTo(entity);
                      handleChange({ haveReferenceTo: entity.id });
                    }}
                    disableTemplatesAccept
                    categoryTypes={[EntityEnums.Class.Resource]}
                    inputWidth="full"
                    placeholder="resource"
                  />
                )}
              </StyledRow>
              <StyledRow>
                <StyledRowHeader>created at</StyledRowHeader>
                {searchData.createdDate ? (
                  <StyledDateTag>
                    <StyledDateTagText>
                      {searchData.createdDate.toDateString()}
                    </StyledDateTagText>
                    <StyledDateTagButton
                      key="d"
                      icon={<RiCloseFill />}
                      color="white"
                      noBorder
                      noBackground
                      inverted
                      tooltipLabel="remove date"
                      onClick={() => {
                        handleChange({ createdDate: undefined });
                      }}
                    />
                  </StyledDateTag>
                ) : (
                  <StyledDatePicker
                    type="date"
                    id="created-date"
                    width="full"
                    name="created-date"
                    onBlur={(e) => {
                      const createdDate = new Date(e.target.value);
                      handleChange({ createdDate });
                    }}
                  />
                )}
              </StyledRow>
              <StyledRow>
                <StyledRowHeader>udpated at</StyledRowHeader>
                {searchData.updatedDate ? (
                  <StyledDateTag>
                    <StyledDateTagText>
                      {searchData.updatedDate.toDateString()}
                    </StyledDateTagText>
                    <StyledDateTagButton
                      key="d"
                      icon={<RiCloseFill />}
                      color="white"
                      noBorder
                      noBackground
                      inverted
                      tooltipLabel="remove date"
                      onClick={() => {
                        handleChange({ updatedDate: undefined });
                      }}
                    />
                  </StyledDateTag>
                ) : (
                  <StyledDatePicker
                    type="date"
                    id="updated-date"
                    width="full"
                    name="updated-date"
                    onBlur={(e) => {
                      const updatedDate = new Date(e.target.value);
                      handleChange({ updatedDate });
                    }}
                  />
                )}
              </StyledRow>
              <StyledRow>
                <StyledRowHeader>Root T validity</StyledRowHeader>

                <AttributeButtonGroup
                  options={[
                    {
                      longValue: "All",
                      shortValue: "All",
                      onClick: () => {
                        handleChange({ isRootInvalid: undefined });
                      },
                      selected: !searchData.isRootInvalid,
                    },
                    {
                      longValue: "Only Invalid",
                      shortValue: "Only Invalid",
                      onClick: () => {
                        handleChange({ isRootInvalid: true });
                      },
                      selected: searchData.isRootInvalid === true,
                    },
                  ]}
                />
              </StyledRow>
            </>
          )}
        </StyledOptions>

        <StyledResultsHeader>
          {sortedEntities.length > 0 && (
            <>{`Results (${sortedEntities.length})`}</>
          )}
        </StyledResultsHeader>

        {/* StyledResultsWrapper is used to calculate size for infinite scroll, don't put any other components inside! */}

        <StyledResultsWrapper ref={resultRef}>
          {/* RESULTS */}
          {sortedEntities.length > 0 && (
            <>
              <EntitySearchResults
                results={sortedEntities}
                height={debouncedResultsHeight}
              />
            </>
          )}
          <Loader show={isFetching} />
        </StyledResultsWrapper>
      </StyledBoxContent>

      {showEntityCreateModal && (
        <EntityCreateModal
          labelTyped={searchData.labelOrId}
          categorySelected={
            searchData.class !== EntityEnums.Extension.Any
              ? searchData.class
              : entitiesDict[0].value
          }
          languageSelected={searchData.language}
          closeModal={() => setShowEntityCreateModal(false)}
          onMutationSuccess={(entity) => {
            if (entity.class !== EntityEnums.Class.Value) {
              appendDetailId(entity.id);
            }
            if (entity.class === EntityEnums.Class.Territory) {
              queryClient.invalidateQueries({ queryKey: ["tree"] });
            }
          }}
        />
      )}
    </>
  );
};

export const MemoizedEntitySearchBox = React.memo(EntitySearchBox);
