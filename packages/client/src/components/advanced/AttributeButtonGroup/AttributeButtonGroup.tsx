import { Button } from "components";
import React from "react";
import {
  StyledButtonWrap,
  StyledPropButtonGroup,
  StyledWrap,
} from "./AttributeButtonGroupStyles";

interface AttributeButtonGroup {
  options: {
    longValue: string;
    shortValue: string;
    shortIcon?: JSX.Element;
    icon?: JSX.Element;
    onClick: () => void;
    selected: boolean;
    optionDisabled?: boolean;
  }[];
  disabled?: boolean;
  // currently means no horizontal margin
  noMargin?: boolean;
  paddingX?: boolean;

  fullSizeDisabled?: boolean;
  disabledBtnsTooltip?: string;
  canSelectMultiple?: boolean;
}

export const AttributeButtonGroup: React.FC<AttributeButtonGroup> = ({
  options = [],
  disabled = false,
  noMargin = false,
  paddingX = false,
  fullSizeDisabled = false,
  disabledBtnsTooltip,
  canSelectMultiple = false,
}) => {
  return (
    <StyledWrap>
      {disabled && !fullSizeDisabled ? (
        <StyledButtonWrap $leftMargin={!noMargin} $rightMargin={!noMargin}>
          <Button
            disabled
            radiusLeft
            radiusRight
            label={options.find((o) => o.selected)?.longValue}
          />
        </StyledButtonWrap>
      ) : (
        <StyledPropButtonGroup
          $leftMargin={!noMargin}
          $rightMargin={!noMargin}
          $border
        >
          {options.map((option, oi) => {
            const firstInRow = oi === 0;
            const lastInRow = oi === options.length - 1;
            return (
              <Button
                key={oi}
                disabled={
                  option.optionDisabled || (disabled && !option.selected)
                }
                label={
                  option.selected
                    ? option.longValue
                    : option.shortValue !== undefined
                    ? option.shortValue
                    : option.longValue
                }
                icon={
                  option.icon
                    ? option.icon
                    : !option.selected && option.shortIcon
                    ? option.shortIcon
                    : undefined
                }
                tooltipLabel={
                  !option.selected &&
                  (option.longValue !== option.shortValue || option.icon)
                    ? option.longValue
                    : undefined
                }
                noBorder
                inverted
                color={option.selected ? "primary" : "greyer"}
                textRegular={option.selected ? false : true}
                radiusLeft={firstInRow}
                radiusRight={lastInRow}
                onClick={() => {
                  if ((!option.selected || canSelectMultiple) && !disabled) {
                    option.onClick();
                  }
                }}
              />
            );
          })}
        </StyledPropButtonGroup>
      )}
    </StyledWrap>
  );
};
