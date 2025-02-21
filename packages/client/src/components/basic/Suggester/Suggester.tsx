import {
  FloatingPortal,
  autoUpdate,
  flip,
  useFloating,
} from "@floating-ui/react";
import { dropdownWildCard } from "@shared/dictionaries/entity";
import { EntityEnums } from "@shared/enums";
import { IEntity, IUserOptions } from "@shared/types";
import { MIN_LABEL_LENGTH_MESSAGE, scrollOverscanCount } from "Theme/constants";
import {
  Button,
  Input,
  Loader,
  TemplateActionModal,
  TypeBar,
} from "components";
import Dropdown from "components/advanced";
import useKeypress from "hooks/useKeyPress";
import React, { useContext, useState } from "react";
import { DropTargetMonitor, useDrop } from "react-dnd";
import { FaPlus } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { toast } from "react-toastify";
import { FixedSizeList as List } from "react-window";
import { ThemeContext } from "styled-components";
import {
  EntityDragItem,
  EntitySingleDropdownItem,
  EntitySuggestion,
  ItemTypes,
  SuggesterItemToCreate,
} from "types";
import { SuggesterKeyPress } from "./SuggesterKeyPress";
import {
  StyledAiOutlineWarning,
  StyledDash,
  StyledInputWrapper,
  StyledRelativePosition,
  StyledSuggester,
  StyledSuggesterButton,
  StyledSuggesterList,
  StyledSuggestionCancelButton,
} from "./SuggesterStyles";
import {
  MemoizedEntityRow,
  SuggestionRowEntityItemData,
} from "./SuggestionRow/SuggestionRow";

interface Suggester {
  marginTop?: boolean;
  suggestions: EntitySuggestion[];
  placeholder?: string; // text to display when typed === ""
  typed: string; // input value
  category: EntityEnums.Class | EntityEnums.Extension.Any; // selected category
  categories: EntitySingleDropdownItem[]; // all possible categories
  disabled?: boolean; // todo not implemented yet
  inputWidth?: number | "full";
  disableCreate?: boolean;
  disableButtons?: boolean;
  isFetching?: boolean;

  preSuggestions?: EntitySuggestion[];

  // events
  onType: (newType: string) => void;
  onChangeCategory: (
    selectedOption: EntityEnums.Class | EntityEnums.Extension.Any
  ) => void;
  onCreate: (item: SuggesterItemToCreate) => void;
  onPick: (entity: IEntity, instantiateTemplate?: boolean) => void;
  onDrop: (item: EntityDragItem, instantiateTemplate?: boolean) => void;
  onHover: (item: EntityDragItem) => void;
  onCancel: () => void;
  cleanOnSelect?: boolean;
  isWrongDropCategory?: boolean;
  isInsideTemplate: boolean;
  territoryParentId?: string;
  userOptions?: IUserOptions;
  autoFocus?: boolean;
  disableEnter?: boolean;
  disableWildCard?: boolean;

  showCreateModal: boolean;
  setShowCreateModal: React.Dispatch<React.SetStateAction<boolean>>;
  alwaysShowCreateModal?: boolean;
  button?: React.ReactNode;
}

export const Suggester: React.FC<Suggester> = ({
  marginTop,
  suggestions = [],
  placeholder = "",
  typed,
  category,
  categories,
  disabled,
  inputWidth = 100,
  disableCreate = false,
  disableButtons = false,

  preSuggestions,

  // events
  onType,
  onChangeCategory,
  onCreate,
  onPick,
  onDrop,
  onHover,
  onCancel,
  isFetching,
  isWrongDropCategory,
  isInsideTemplate = false,
  territoryParentId,

  userOptions,
  autoFocus,
  disableEnter,
  disableWildCard,

  showCreateModal,
  setShowCreateModal,
  alwaysShowCreateModal,
  button,
}) => {
  const [selected, setSelected] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [tempDropItem, setTempDropItem] = useState<EntityDragItem | false>(
    false
  );

  useKeypress(
    "Escape",
    () => {
      if (!showCreateModal && isFocused) onCancel();
    },
    [showCreateModal, isFocused]
  );

  const onTypeFn = (newType: string) => {
    setSelected(-1);
    onType(newType);
  };

  const [{ isOver }, dropRef] = useDrop({
    accept: ItemTypes.TAG,
    drop: (item: EntityDragItem) => {
      if (!isWrongDropCategory) {
        if (!item.isTemplate) {
          onDrop(item);
        } else if (item.isTemplate && !isInsideTemplate) {
          onDrop(item, true);
        } else if (item.isTemplate && isInsideTemplate) {
          if (item.entityClass === EntityEnums.Class.Territory) {
            // this option is now unused - not allowed to add T template to S template
            onDrop(item);
            // TODO: notification why not instantiated - used because of missing parent
          } else {
            setTempDropItem(item);
            setShowTemplateModal(true);
          }
        }
      }
    },
    hover: (item: EntityDragItem) => {
      onHover && onHover(item);
    },
    collect: (monitor: DropTargetMonitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const handleEnterPress = () => {
    if (selected === -1 && typed.length > 0) {
      if (!disableCreate) {
        if (
          category === dropdownWildCard.value ||
          category === EntityEnums.Class.Statement ||
          category === EntityEnums.Class.Territory ||
          alwaysShowCreateModal
        ) {
          setShowCreateModal(true);
        } else {
          onCreate({
            label: typed.trim(),
            entityClass: category as EntityEnums.Class,
            language: false,
          });
        }
      }
    } else if (selected > -1) {
      if (!disableEnter) {
        const entity = suggestions[selected].entity;
        if (entity.status !== EntityEnums.Status.Discouraged) {
          if (!entity.isTemplate) {
            onPick(entity);
          } else if (entity.isTemplate && !isInsideTemplate) {
            onPick(entity, true);
          } else if (entity.isTemplate && isInsideTemplate) {
            // TODO: open modal to ask use / duplicate
            // setTempDropItem(entity);
            setShowTemplateModal(true);
          }
        }
      }
    } else {
      toast.info(MIN_LABEL_LENGTH_MESSAGE);
    }
    setSelected(-1);
  };

  const handleAddBtnClick = () => {
    if (typed.length > 0) {
      if (
        category === dropdownWildCard.value ||
        category === EntityEnums.Class.Statement ||
        category === EntityEnums.Class.Territory ||
        alwaysShowCreateModal
      ) {
        setShowCreateModal(true);
      } else {
        onCreate({
          label: typed.trim(),
          entityClass: category as EntityEnums.Class,
          language: false,
        });
      }
    } else {
      toast.info("Fill at least 1 character");
    }
    setSelected(-1);
  };

  const renderEntitySuggestions = (suggestions: EntitySuggestion[]) => {
    const itemData: SuggestionRowEntityItemData = {
      items: suggestions,
      onPick,
      selected,
      isInsideTemplate,
      territoryParentId,
      disableButtons,
    };

    const rowHeight = 25;
    return (
      <List
        itemData={itemData as SuggestionRowEntityItemData}
        height={
          suggestions.length > 7
            ? rowHeight * 8
            : rowHeight * suggestions.length
        }
        itemCount={suggestions.length}
        itemSize={rowHeight}
        width="100%"
        overscanCount={scrollOverscanCount}
      >
        {MemoizedEntityRow}
      </List>
    );
  };

  const { refs, floatingStyles, middlewareData } = useFloating({
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [flip({ padding: 10 })],
  });

  const themeContext = useContext(ThemeContext);

  if (disabled) {
    return <StyledDash>-</StyledDash>;
  }

  return (
    // div is necessary for flex to work and render the clear button properly
    <div>
      <StyledSuggester
        $marginTop={marginTop}
        $fullWidth={inputWidth === "full"}
        $isFocused={isFocused}
      >
        <StyledInputWrapper
          ref={dropRef}
          $hasButton={!disableCreate}
          $isOver={isOver}
          $hasText={typed.length > 0}
        >
          <Dropdown.Single.Entity
            value={category}
            options={
              disableWildCard
                ? [...categories]
                : [dropdownWildCard, ...categories]
            }
            onChange={onChangeCategory}
            width={36}
            onFocus={() => {
              setSelected(-1);
              setIsFocused(true);
            }}
            onBlur={() => setIsFocused(false)}
            disableTyping
            suggester
            disabled={disabled}
            autoFocus={categories.length > 1 && autoFocus}
          />
          <TypeBar entityLetter={category} />

          <div
            ref={refs.setReference}
            style={{
              position: "relative",
              width: "100%",
            }}
          >
            <Input
              type="text"
              value={typed}
              onChangeFn={(newType: string) => onTypeFn(newType)}
              placeholder={placeholder}
              suggester
              changeOnType
              width={inputWidth}
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => {
                // Comment this for debug
                setIsFocused(false);
                setSelected(-1);
              }}
              onEnterPressFn={handleEnterPress}
              autoFocus={categories.length === 1 && autoFocus}
              disabled={disabled}
            />
            {typed.length > 0 && (
              <StyledSuggestionCancelButton>
                <MdCancel size={16} onClick={() => onCancel()} />
              </StyledSuggestionCancelButton>
            )}
          </div>

          {!disableCreate && (
            <StyledSuggesterButton>
              <Button
                icon={<FaPlus style={{ fontSize: "16px", padding: "2px" }} />}
                tooltipLabel="create new entity"
                color="primary"
                inverted={selected !== -1}
                onClick={() => {
                  handleAddBtnClick();
                }}
                disabled={disabled}
              />
            </StyledSuggesterButton>
          )}
          {button}
        </StyledInputWrapper>

        {isWrongDropCategory && isOver && (
          <StyledAiOutlineWarning
            size={22}
            color={themeContext?.color.warning}
          />
        )}

        {(isFocused || isHovered) && !middlewareData.hide?.referenceHidden && (
          <FloatingPortal id="page">
            <StyledSuggesterList
              ref={refs.setFloating}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{
                ...floatingStyles,
              }}
            >
              {suggestions.length || (isFetching && isFocused) ? (
                <>
                  <StyledRelativePosition>
                    {renderEntitySuggestions(suggestions)}
                    <Loader size={30} show={isFetching} />
                  </StyledRelativePosition>
                  <SuggesterKeyPress
                    onArrowDown={() => {
                      if (selected < suggestions.length - 1)
                        setSelected(selected + 1);
                    }}
                    onArrowUp={() => {
                      if (selected > -1) setSelected(selected - 1);
                    }}
                    dependencyArr={[selected]}
                  />
                </>
              ) : null}

              {/* PRE-SUGGESTIONS */}
              {preSuggestions?.length && typed.length === 0 ? (
                <>
                  <StyledRelativePosition>
                    {renderEntitySuggestions(preSuggestions)}
                    <Loader size={30} show={isFetching} />
                  </StyledRelativePosition>
                  <SuggesterKeyPress
                    onArrowDown={() => {
                      if (selected < preSuggestions.length - 1)
                        setSelected(selected + 1);
                    }}
                    onArrowUp={() => {
                      if (selected > -1) setSelected(selected - 1);
                    }}
                    dependencyArr={[selected]}
                  />
                </>
              ) : null}
            </StyledSuggesterList>
          </FloatingPortal>
        )}
      </StyledSuggester>

      {showTemplateModal && (
        <TemplateActionModal
          onClose={() => {
            setTempDropItem(false);
            setShowTemplateModal(false);
          }}
          onUse={() => {
            {
              tempDropItem && onDrop(tempDropItem);
              setTempDropItem(false);
              setShowTemplateModal(false);
            }
          }}
          onInstantiate={() => {
            tempDropItem && onDrop(tempDropItem, true);
            setTempDropItem(false);
            setShowTemplateModal(false);
          }}
        />
      )}
    </div>
  );
};
