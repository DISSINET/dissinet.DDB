import { allEntities } from "@shared/dictionaries/entity";
import { EntityEnums } from "@shared/enums";
import { heightHeader } from "Theme/constants";
import { Tooltip } from "components";
import React, { useState } from "react";
import { FaCheckSquare, FaRegSquare } from "react-icons/fa";
import {
  ActionMeta,
  ControlProps,
  DropdownIndicatorProps,
  GroupBase,
  MultiValueProps,
  OptionProps,
  SingleValueProps,
  ValueContainerProps,
  components,
} from "react-select";
import { SelectComponents } from "react-select/dist/declarations/src/components";
import { DropdownItem, EntityColors } from "types";
import {
  StyledEntityMultiValue,
  StyledEntityValue,
  StyledFaChevronDown,
  StyledIconWrap,
  StyledSelect,
  StyledSelectWrapper,
} from "./BaseDropdownStyles";

interface BaseDropdown {
  options?: DropdownItem[];
  value?: DropdownItem | DropdownItem[] | null;
  onChange: (
    selectedOption: DropdownItem[],
    event?: ActionMeta<unknown>
  ) => void;
  // appearance props
  width?: number | "full";
  placeholder?: string;
  noOptionsMessage?: string;
  icon?: JSX.Element;
  tooltipLabel?: string;
  // single entity dropdown props
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  suggester?: boolean;
  // dropdown type settings
  isMulti?: boolean;
  entityDropdown?: boolean;
  attributeDropdown?: boolean;
  //
  disableTyping?: boolean;
  disabled?: boolean;
  // override lib components
  components?: Partial<SelectComponents<unknown, boolean, GroupBase<unknown>>>;
  // for logging / debugging purposes
  loggerId?: string;
  // currently unused props
  isClearable?: boolean;
  hideSelectedOptions?: boolean;
  noDropDownIndicator?: boolean;
}
export const BaseDropdown: React.FC<BaseDropdown> = ({
  options = [],
  value,
  onChange,
  components = undefined,
  width,
  hideSelectedOptions = false,
  noDropDownIndicator = false,
  placeholder = "select..",
  noOptionsMessage = "no option selected",
  isClearable = false,
  isMulti = false,
  disabled = false,
  onFocus = () => {},
  onBlur = () => {},
  autoFocus = false,
  disableTyping = false,
  suggester = false,

  icon,
  tooltipLabel,
  entityDropdown = false,
  attributeDropdown,

  loggerId,
}) => {
  const isOneOptionSingleEntitySelect =
    options.length < 2 && !isMulti && entityDropdown;

  const [referenceElement, setReferenceElement] =
    useState<HTMLButtonElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <>
      <StyledSelectWrapper
        width={width}
        ref={setReferenceElement}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(false)}
      >
        <StyledSelect
          // menuIsOpen={attributeDropdown && isMulti}
          suggester={suggester}
          onFocus={onFocus}
          autoFocus={autoFocus}
          onBlur={onBlur}
          isMulti={isMulti}
          isDisabled={disabled || isOneOptionSingleEntitySelect}
          isOneOptionSingleEntitySelect={isOneOptionSingleEntitySelect}
          attributeDropdown={attributeDropdown}
          entityDropdown={entityDropdown}
          wildCardChar={
            (value as DropdownItem)?.label === EntityEnums.Extension.Any
          }
          className="react-select-container"
          classNamePrefix="react-select"
          placeholder={placeholder}
          noOptionsMessage={() => noOptionsMessage}
          isClearable={isClearable}
          captureMenuScroll={false}
          components={{
            Option,
            SingleValue,
            MultiValue,
            ValueContainer,
            DropdownIndicator,
            Control,
            MenuPortal,
          }}
          isSearchable={!disableTyping}
          value={value}
          icon={icon}
          styles={{
            dropdownIndicator: () => {
              return {
                display:
                  noDropDownIndicator || isOneOptionSingleEntitySelect
                    ? "none"
                    : "",
              };
            },
            menuPortal: (base) => ({
              ...base,
              marginTop: `${-heightHeader}px`,
              zIndex: 9999,
            }),
          }}
          menuPortalTarget={document.getElementById("page")!}
          menuPosition="absolute"
          onChange={(selected: unknown, event: ActionMeta<unknown>) => {
            const selectedOptions: DropdownItem[] = Array.isArray(selected)
              ? selected
              : [selected];

            if (!isMulti) {
              return onChange(selectedOptions);
            } else {
              return onChange(selectedOptions, event);
            }
          }}
          options={options}
          width={width}
          hideSelectedOptions={hideSelectedOptions}
          loggerId={loggerId}
        />
      </StyledSelectWrapper>

      {/* Tooltip */}
      {tooltipLabel && (
        <Tooltip
          disabled={isMulti && (value as DropdownItem[])?.length === 0}
          content={
            <p>
              {isMulti ? (
                <>
                  <b>
                    {(value as DropdownItem[]).map((v, key) => {
                      return (
                        <React.Fragment key={key}>
                          {v.value !== allEntities.value && (
                            <>
                              {v.label}
                              {key !== (value as DropdownItem[])?.length - 1 &&
                                ", "}
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </b>{" "}
                  ({tooltipLabel})
                </>
              ) : (
                <b>{tooltipLabel}</b>
              )}
            </p>
          }
          visible={showTooltip}
          referenceElement={referenceElement}
          position="top"
        />
      )}
    </>
  );
};

const SingleValue = (props: SingleValueProps): React.ReactElement => {
  return (
    <>
      <components.SingleValue {...props}></components.SingleValue>
    </>
  );
};

const Option = ({ ...props }: OptionProps | any): React.ReactElement => {
  const { entityDropdown, attributeDropdown, isMulti } = props.selectProps;

  if (entityDropdown && !isMulti) {
    // SINGLE ENTITY DROPDOWN
    return (
      <components.Option {...props}>
        <StyledEntityValue
          color={EntityColors[props.value]?.color ?? "transparent"}
        >
          {props.label}
        </StyledEntityValue>
      </components.Option>
    );
  } else if (entityDropdown && isMulti) {
    // MULTI ENTITY DROPDOWN
    const isEntityClass = Object.values(EntityEnums.Class).includes(
      props.value
    );
    return (
      <components.Option {...props}>
        <div
          style={{ display: "flex", alignItems: "center", height: "2.5rem" }}
        >
          <span style={{ margin: "0 0.2rem" }}>
            {props.isSelected ? <FaCheckSquare /> : <FaRegSquare />}
          </span>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "1.5rem",
            }}
          >
            {isEntityClass && props.value}
          </div>
          <StyledEntityValue
            color={
              props.value === EntityEnums.Extension.Empty
                ? "transparent"
                : EntityColors[props.value]?.color ?? "transparent"
            }
          >
            {isEntityClass ? props.label : <i>{props.label}</i>}
          </StyledEntityValue>
        </div>
      </components.Option>
    );
  } else if (isMulti && attributeDropdown) {
    return (
      <components.Option {...props}>
        {props.value !== allEntities.value ? props.label : <i>{props.label}</i>}
      </components.Option>
    );
  }

  return <components.Option {...props} />;
};

// If multiple values are not merged into all options, this component is rendered separately for every single value
const MultiValue = (props: MultiValueProps<any>): React.ReactElement => {
  let labelToBeDisplayed = `${props.data.label}`;
  // @ts-ignore
  const { attributeDropdown, entityDropdown, value, options } =
    props.selectProps;

  if (attributeDropdown && value.length > 1) {
    if (value.length === options?.length) {
      labelToBeDisplayed = `${value.length - 1} selected`;
    } else {
      labelToBeDisplayed = `${value.length} selected`;
    }
  } else if (props.data.value === allEntities.value) {
    labelToBeDisplayed = "All options selected";
  }

  if (entityDropdown) {
    return (
      <components.MultiValue {...props}>
        <StyledEntityMultiValue
          $color={EntityColors[props.data.value]?.color ?? "transparent"}
        >
          {labelToBeDisplayed}
        </StyledEntityMultiValue>
      </components.MultiValue>
    );
  }

  return (
    <components.MultiValue {...props}>
      <span>{labelToBeDisplayed}</span>
    </components.MultiValue>
  );
};

const ValueContainer = ({
  children,
  ...props
}: { children: any } & ValueContainerProps<
  any,
  any,
  any
>): React.ReactElement => {
  // @ts-ignore
  const { value, entityDropdown, isMulti, attributeDropdown } =
    props.selectProps;

  const currentValues: DropdownItem[] = [...props.getValue()];
  let toBeRendered = children;

  if (isMulti) {
    if (attributeDropdown && currentValues.length > 1) {
      // show only one merged value
      toBeRendered = [children[0][0], children[1]];
    } else if (entityDropdown && currentValues.length > 0) {
      // filter ANY out of the values array
      toBeRendered = [
        children[0].filter(
          (ch: any) => ch.key !== `${allEntities.label}-${allEntities.value}`
        ),
        children[1],
      ];
    }
  }

  return (
    <>
      <components.ValueContainer {...props}>
        {toBeRendered}
      </components.ValueContainer>
    </>
  );
};

const DropdownIndicator = (props: DropdownIndicatorProps) => {
  return (
    <components.DropdownIndicator {...props}>
      <StyledFaChevronDown size={9} />
    </components.DropdownIndicator>
  );
};

const Control = ({ children, ...props }: ControlProps<any, false>) => {
  // @ts-ignore
  const { icon } = props.selectProps;

  return (
    <components.Control {...props}>
      {icon && <StyledIconWrap>{icon}</StyledIconWrap>}
      {children}
    </components.Control>
  );
};

const MenuPortal: typeof components.MenuPortal = (props) => {
  // @ts-ignore
  const { entityDropdown } = props.selectProps;

  return (
    <components.MenuPortal
      {...props}
      className={entityDropdown ? "react-select__entity-dropdown" : ""}
    />
  );
};
