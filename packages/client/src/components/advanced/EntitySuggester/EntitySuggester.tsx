import {
  dropdownWildCard,
  entitiesDictKeys,
} from "@shared/dictionaries/entity";
import { EntityEnums, UserEnums } from "@shared/enums";
import {
  IEntity,
  IResponseEntity,
  IStatement,
  ITerritory,
} from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wildCardChar } from "Theme/constants";
import api from "api";
import { Suggester } from "components";
import { CEntity, InstTemplate } from "constructors";
import { useDebounce, useSearchParams } from "hooks";
import React, { useEffect, useState } from "react";
import { FaHome } from "react-icons/fa";
import {
  EntityDragItem,
  EntitySingleDropdownItem,
  SuggesterItemToCreate,
} from "types";
import { deepCopy } from "utils/utils";
import { AddTerritoryModal, EntityCreateModal } from "..";

interface EntitySuggester {
  categoryTypes: EntityEnums.Class[];
  onSelected?: (id: string) => void;
  onPicked?: (entity: IEntity) => void;
  onChangeCategory?: (
    selectedOption: EntityEnums.Class | EntityEnums.Extension.Any
  ) => void;
  onTyped?: (newType: string) => void;
  placeholder?: string;
  inputWidth?: number | "full";
  openDetailOnCreate?: boolean;
  territoryActants?: string[];
  excludedEntityClasses?: EntityEnums.Class[];
  excludedActantIds?: string[];
  filterEditorRights?: boolean;
  isInsideTemplate?: boolean;
  isInsideStatement?: boolean;
  territoryParentId?: string;

  button?: React.ReactNode;
  preSuggestions?: IEntity[];

  disableCreate?: boolean;
  disableTemplateInstantiation?: boolean;
  disableWildCard?: boolean;
  disableTemplatesAccept?: boolean;
  disableButtons?: boolean;

  disableEnter?: boolean;
  autoFocus?: boolean;

  initTyped?: string;
  initCategory?: EntityEnums.Class;
  // not necessary to base functionality, use wisely
  externalTyped?: string;

  alwaysShowCreateModal?: boolean;

  disabled?: boolean;
}

export const EntitySuggester: React.FC<EntitySuggester> = ({
  categoryTypes,
  onSelected = () => {},
  onPicked = () => {},
  onChangeCategory,
  onTyped,
  placeholder = "",
  inputWidth,
  openDetailOnCreate = false,
  territoryActants,
  excludedEntityClasses = [],
  filterEditorRights = false,
  excludedActantIds = [],
  isInsideTemplate = false,
  isInsideStatement = false,
  territoryParentId,

  button,
  preSuggestions,

  disableCreate,
  disableTemplateInstantiation = false,
  disableWildCard = false,
  disableTemplatesAccept = false,
  disableButtons = false,
  disableEnter,
  autoFocus,

  initTyped,
  initCategory,
  externalTyped,

  alwaysShowCreateModal,

  disabled = false,
}) => {
  const [typed, setTyped] = useState<string>(initTyped ?? "");
  const debouncedTyped = useDebounce(typed, 100);
  const [selectedCategory, setSelectedCategory] = useState<
    EntityEnums.Class | EntityEnums.Extension.Any
  >();
  const [allCategories, setAllCategories] =
    useState<EntitySingleDropdownItem[]>();

  useEffect(() => {
    if (externalTyped !== undefined) {
      setTyped(externalTyped);
    }
  }, [externalTyped]);

  // initial load of categories
  useEffect(() => {
    if (categoryTypes.length) {
      setAllCategories(
        categoryTypes.map((c) => {
          return {
            value: c,
            label: c,
            info: entitiesDictKeys[c]?.info,
          };
        })
      );
      if (initCategory) {
        setSelectedCategory(initCategory);
      } else {
        setSelectedCategory(
          !disableWildCard && categoryTypes.length > 1
            ? EntityEnums.Extension.Any
            : categoryTypes[0]
        );
      }
    }
  }, [categoryTypes]);

  const { appendDetailId } = useSearchParams();

  // get user data
  const userId = localStorage.getItem("userid");
  const userRole = localStorage.getItem("userrole");

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

  // Suggesions query
  const {
    status: statusStatement,
    data: suggestions,
    error: errorStatement,
    isFetching: isFetchingStatement,
  } = useQuery({
    queryKey: [
      "suggestion",
      debouncedTyped,
      selectedCategory,
      excludedEntityClasses,
    ],
    queryFn: async () => {
      const resSuggestions = await api.entitiesSearch({
        label: debouncedTyped + wildCardChar,
        class:
          selectedCategory === dropdownWildCard.value
            ? undefined
            : (selectedCategory as EntityEnums.Class),
        excluded: excludedEntityClasses.length
          ? excludedEntityClasses
          : undefined,
      });

      return filterSuggestions(resSuggestions.data);
    },
    enabled:
      debouncedTyped.length > 1 &&
      !!selectedCategory &&
      !excludedEntityClasses
        .map((key) => key.valueOf())
        .includes(selectedCategory) &&
      api.isLoggedIn(),
  });

  const filterSuggestions = (suggestions: IResponseEntity[]) => {
    return (
      deepCopy(suggestions)
        .sort((a, b) => {
          if (a.status === EntityEnums.Status.Discouraged) {
            return 1;
          } else {
            return -1;
          }
        })
        .filter((s) =>
          filterEditorRights &&
          userRole !== UserEnums.Role.Admin &&
          userRole !== UserEnums.Role.Owner
            ? s.right === UserEnums.RoleMode.Write
            : s
        )
        .filter((s) =>
          excludedActantIds.length ? !excludedActantIds.includes(s.id) : s
        )
        .filter((s) => (disableTemplatesAccept ? !s.isTemplate : s))
        // filter T or S template inside S template
        .filter(
          (s) =>
            !(
              (s.class === EntityEnums.Class.Territory ||
                s.class === EntityEnums.Class.Statement) &&
              s.isTemplate &&
              isInsideStatement &&
              isInsideTemplate
            )
        )
        .filter((s) => categoryTypes.includes(s.class))
        .map((entity: IEntity) => {
          const icons: React.ReactNode[] = [];

          if (territoryActants?.includes(entity.id)) {
            icons.push(<FaHome key={entity.id} color="" />);
          }

          return {
            entity: entity,
            icons: icons,
          };
        })
    );
  };

  const handleClean = () => {
    setTyped("");
    onTyped && onTyped("");
  };

  useEffect(() => {
    if (initTyped && initTyped !== typed) {
      setTyped(initTyped);
    }
  }, [initTyped]);

  const queryClient = useQueryClient();

  const onMutationSuccess = (entity: IEntity) => {
    onSelected(entity.id);
    onPicked(entity);
    handleClean();
    if (openDetailOnCreate && entity.class !== EntityEnums.Class.Value) {
      appendDetailId(entity.id);
    }
    if (entity.class === EntityEnums.Class.Territory) {
      queryClient.invalidateQueries({ queryKey: ["tree"] });
    }
  };

  const entityCreateMutation = useMutation({
    mutationFn: async (newActant: IEntity | IStatement | ITerritory) =>
      await api.entityCreate(newActant),
    onSuccess: (data, variables) => {
      onMutationSuccess(variables);
    },
  });

  const handleCreate = (newCreated: {
    label: string;
    entityClass: EntityEnums.Class;
    detail?: string;
    language: EntityEnums.Language | false;
    territoryId?: string;
  }) => {
    if (user) {
      const newEntity = CEntity(
        {
          ...user.options,
          defaultLanguage: newCreated.language || user.options.defaultLanguage,
        },
        newCreated.entityClass,
        newCreated.label,
        newCreated.detail
      );
      entityCreateMutation.mutate(newEntity);
    }
  };

  const [showAddTerritoryModal, setShowAddTerritoryModal] = useState(false);
  const [tempTemplateToInstantiate, setTempTemplateToInstantiate] = useState<
    ITerritory | false
  >(false);

  const instantiateTerritory = async (
    territoryToInst: ITerritory,
    territoryParentId?: string
  ): Promise<IEntity | false> => {
    return await InstTemplate(
      territoryToInst,
      localStorage.getItem("userrole") as UserEnums.Role,
      territoryParentId
    );
  };

  const handleInstantiateTemplate = async (
    templateToDuplicate: IEntity | IStatement | ITerritory
  ) => {
    let newEntity: IEntity | false;
    if (templateToDuplicate.class === EntityEnums.Class.Territory) {
      if (territoryParentId) {
        newEntity = await instantiateTerritory(
          templateToDuplicate as ITerritory,
          territoryParentId
        );
      } else {
        setTempTemplateToInstantiate(templateToDuplicate as ITerritory);
        setShowAddTerritoryModal(true);
        return;
      }
    } else {
      newEntity = await InstTemplate(
        templateToDuplicate,
        localStorage.getItem("userrole") as UserEnums.Role
      );
    }
    if (newEntity) {
      onSelected(newEntity.id);
      onPicked(newEntity);
      handleClean();
      if (
        openDetailOnCreate &&
        templateToDuplicate.class !== EntityEnums.Class.Value
      ) {
        appendDetailId(newEntity.id);
      }
      if (templateToDuplicate.class === EntityEnums.Class.Territory) {
        queryClient.invalidateQueries({ queryKey: ["tree"] });
      }
    }
  };

  const handlePick = (newPicked: IEntity, instantiateTemplate?: boolean) => {
    if (instantiateTemplate && !disableTemplateInstantiation) {
      handleInstantiateTemplate(newPicked);
    } else {
      onSelected(newPicked.id);
      onPicked(newPicked);
      handleClean();
    }
  };

  const handleDropped = (
    newDropped: EntityDragItem,
    instantiateTemplate?: boolean
  ) => {
    if (!isWrongDropCategory) {
      if (instantiateTemplate && !disableTemplateInstantiation) {
        newDropped.entity && handleInstantiateTemplate(newDropped.entity);
      } else {
        onSelected(newDropped.id);
        newDropped.entity && onPicked(newDropped.entity);
        handleClean();
      }
    }
  };

  const [isWrongDropCategory, setIsWrongDropCategory] = useState(false);

  const handleHoverred = (newHoverred: EntityDragItem) => {
    const hoverredCategory = newHoverred.entityClass;
    if (
      !allCategories?.map((c) => c.value).includes(hoverredCategory) ||
      (disableTemplatesAccept && newHoverred.isTemplate) ||
      newHoverred.isDiscouraged ||
      excludedActantIds.includes(newHoverred.id) ||
      excludedEntityClasses.includes(newHoverred.entityClass) ||
      // Is T or S template inside S template
      ((newHoverred.entityClass === EntityEnums.Class.Territory ||
        newHoverred.entityClass === EntityEnums.Class.Statement) &&
        isInsideStatement &&
        isInsideTemplate &&
        newHoverred.isTemplate) ||
      disabled
    ) {
      setIsWrongDropCategory(true);
    } else {
      setIsWrongDropCategory(false);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);

  const getClassFilteredPreSuggestions = (suggestions: IEntity[]) => {
    let filteredSuggestions;
    if (selectedCategory !== dropdownWildCard.value) {
      filteredSuggestions = suggestions.filter(
        (s) => s.class === selectedCategory
      );
    } else {
      filteredSuggestions = suggestions;
    }

    if (excludedEntityClasses.length) {
      filteredSuggestions = filteredSuggestions.filter(
        (entity) => !excludedEntityClasses.includes(entity.class)
      );
    }

    return filteredSuggestions;
  };

  return selectedCategory && allCategories && user ? (
    <>
      <Suggester
        isFetching={isFetchingStatement}
        marginTop={false}
        suggestions={suggestions || []}
        preSuggestions={
          preSuggestions &&
          filterSuggestions(getClassFilteredPreSuggestions(preSuggestions))
        }
        placeholder={placeholder}
        typed={typed} // input value
        category={selectedCategory} // selected category
        categories={allCategories} // all possible categories
        onCancel={handleClean}
        onType={(newType: string) => {
          setTyped(newType);
          onTyped && onTyped(newType);
        }}
        onChangeCategory={(option) => {
          setSelectedCategory(option);
          onChangeCategory && onChangeCategory(option);
        }}
        onCreate={(newCreated: SuggesterItemToCreate) => {
          handleCreate(newCreated);
        }}
        onPick={(newPicked: IEntity, instantiateTemplate?: boolean) => {
          handlePick(newPicked, instantiateTemplate);
        }}
        onDrop={(newDropped: EntityDragItem, instantiateTemplate?: boolean) => {
          if (!disabled) {
            handleDropped(newDropped, instantiateTemplate);
          }
        }}
        onHover={(newHoverred: EntityDragItem) => {
          handleHoverred(newHoverred);
        }}
        isWrongDropCategory={isWrongDropCategory}
        disableCreate={disableCreate}
        disableButtons={disableButtons}
        disableEnter={disableEnter}
        inputWidth={inputWidth}
        isInsideTemplate={isInsideTemplate}
        territoryParentId={territoryParentId}
        userOptions={user.options}
        autoFocus={autoFocus}
        disabled={disabled}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        alwaysShowCreateModal={alwaysShowCreateModal}
        disableWildCard={disableWildCard || allCategories.length < 2}
        button={button}
      />
      {showAddTerritoryModal && (
        <AddTerritoryModal
          onSubmit={async (territoryId: string) => {
            setShowAddTerritoryModal(false);
            const newEntity = await instantiateTerritory(
              tempTemplateToInstantiate as ITerritory,
              territoryId
            );
            if (newEntity) {
              onSelected(newEntity.id);
              onPicked(newEntity);
              handleClean();
              if (openDetailOnCreate) {
                appendDetailId(newEntity.id);
              }
              queryClient.invalidateQueries({ queryKey: ["tree"] });
            }
            setTempTemplateToInstantiate(false);
          }}
          onClose={() => setShowAddTerritoryModal(false)}
        />
      )}

      {showCreateModal && (
        <EntityCreateModal
          labelTyped={typed}
          categorySelected={
            selectedCategory !== EntityEnums.Extension.Any
              ? selectedCategory
              : allCategories[0].value
          }
          closeModal={() => setShowCreateModal(false)}
          onMutationSuccess={(entity) => onMutationSuccess(entity)}
          allowedEntityClasses={categoryTypes}
        />
      )}
    </>
  ) : (
    <div />
  );
};
