import { BaseDropdown } from "components";
import React from "react";
import { OptionProps, components } from "react-select";
import { EntityColors } from "types";
import { StyledEntityValue } from "./DropdownStyles";

interface EntitySingleDropdown<T = string> {
  width?: number | "full";
  options: { value: T; label: string; info?: string }[];
  value: T;
  placeholder?: string;
  onChange: (value: T) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  suggester?: boolean;
  disableTyping?: boolean;
  disabled?: boolean;

  loggerId?: string;
}
export const EntitySingleDropdown = <T extends string>({
  width,
  options,
  value,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  autoFocus,
  suggester,
  disableTyping,
  disabled,

  loggerId,
}: EntitySingleDropdown<T>) => {
  return (
    <BaseDropdown
      entityDropdown
      width={width}
      value={options.find((o) => o.value === value)}
      options={options}
      onChange={(value) => onChange(value[0].value as T)}
      placeholder={placeholder}
      onFocus={onFocus}
      onBlur={onBlur}
      suggester={suggester}
      disableTyping={disableTyping}
      disabled={disabled}
      autoFocus={autoFocus}
      loggerId={loggerId}
      customComponents={{ Option }}
    />
  );
};

const Option = ({ ...props }: OptionProps | any): React.ReactElement => {
  return (
    <components.Option {...props}>
      <StyledEntityValue
        color={EntityColors[props.value]?.color ?? "transparent"}
      >
        {props.label}
      </StyledEntityValue>
    </components.Option>
  );
};
