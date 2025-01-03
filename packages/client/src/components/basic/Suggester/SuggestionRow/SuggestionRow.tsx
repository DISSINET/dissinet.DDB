import { EntityEnums } from "@shared/enums";
import { IEntity } from "@shared/types";
import { Button, ButtonGroup } from "components";
import { EntityTag } from "components/advanced";
import React from "react";
import { FaLink, FaPlusSquare } from "react-icons/fa";
import { areEqual } from "react-window";
import { EntitySuggestion } from "types";
import {
  StyledSuggestionLineActions,
  StyledSuggestionLineIcons,
  StyledSuggestionLineTag,
  StyledSuggestionRow,
  StyledTagWrapper,
} from "../SuggesterStyles";

export type SuggestionRowEntityItemData = {
  items: EntitySuggestion[];
  onPick: (entity: IEntity, duplicate?: boolean) => void;
  selected: number;
  isInsideTemplate: boolean;
  territoryParentId: string | undefined;
  disableButtons: boolean;
};

interface EntityRow {
  data: SuggestionRowEntityItemData;
  index: number;
  style: any;
}

const EntityRow: React.FC<EntityRow> = ({ data, index, style }) => {
  const {
    items,
    onPick,
    selected,
    isInsideTemplate,
    territoryParentId,
    disableButtons,
  } = data;
  const { entity, icons } = items[index];
  const isNotDiscouraged = entity.status !== EntityEnums.Status.Discouraged;
  const territoryWithoutParent =
    entity.class === EntityEnums.Class.Territory && !territoryParentId;

  const renderIcons = () => {
    return (
      <ButtonGroup $noMarginRight>
        {!entity.isTemplate && (
          <Button
            tooltipLabel="link entity"
            inverted
            noBorder
            noBackground
            color="black"
            key="link entity"
            noIconMargin
            icon={
              <FaLink
                onClick={() => {
                  // onPick nonTemplate entity
                  onPick(entity);
                }}
              />
            }
          />
        )}
        {entity.isTemplate && !territoryWithoutParent && (
          <Button
            tooltipLabel="link a new template instance"
            key="instantiate template"
            inverted
            noBorder
            noBackground
            icon={
              <FaPlusSquare
                onClick={() => {
                  // onPick template inside nonTemplate
                  onPick(entity, true);
                }}
              />
            }
          />
        )}
        {entity.isTemplate && isInsideTemplate && (
          <Button
            tooltipLabel="link template"
            key="link template"
            inverted
            noBorder
            noBackground
            icon={
              <FaLink
                onClick={() => {
                  // onPick template entity
                  onPick(entity);
                }}
              />
            }
          />
        )}
      </ButtonGroup>
    );
  };

  const entityIsTemplate = entity.isTemplate || false;

  return (
    <StyledSuggestionRow
      key={index}
      style={style}
      $twoIcons={
        entityIsTemplate && isInsideTemplate && !territoryWithoutParent
      }
      $isSelected={selected === index}
    >
      <StyledSuggestionLineActions>
        {!disableButtons && isNotDiscouraged && <>{renderIcons()}</>}
      </StyledSuggestionLineActions>
      <StyledSuggestionLineTag>
        <StyledTagWrapper>
          <EntityTag fullWidth entity={entity} tooltipPosition="right" />
        </StyledTagWrapper>
      </StyledSuggestionLineTag>
      <StyledSuggestionLineIcons>{icons}</StyledSuggestionLineIcons>
    </StyledSuggestionRow>
  );
};

export const MemoizedEntityRow = React.memo(EntityRow, areEqual);
