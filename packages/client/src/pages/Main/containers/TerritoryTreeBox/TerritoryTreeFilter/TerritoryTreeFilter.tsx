import { UserEnums } from "@shared/enums";
import { Checkbox, Input } from "components";
import React, { useContext } from "react";
import { FaSearch } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { ThemeContext } from "styled-components";
import { ITerritoryFilter } from "types";
import {
  StyledCancelButton,
  StyledFilterList,
  StyledFilterWrap,
  StyledInputWrap,
} from "./TerritoryTreeFilterStyles";

interface TerritoryTreeFilter {
  filterData: ITerritoryFilter;
  handleFilterChange: (
    key: keyof ITerritoryFilter,
    value: boolean | string
  ) => void;
  userRole: string | null;
}
export const TerritoryTreeFilter: React.FC<TerritoryTreeFilter> = ({
  filterData,
  handleFilterChange,
  userRole,
}) => {
  const themeContext = useContext(ThemeContext);

  return (
    <StyledFilterWrap>
      <StyledFilterList>
        <Checkbox
          label="non empty"
          value={filterData.nonEmpty}
          onChangeFn={(value: boolean) => handleFilterChange("nonEmpty", value)}
        />
        <Checkbox
          label="starred"
          value={filterData.starred}
          onChangeFn={(value: boolean) => handleFilterChange("starred", value)}
        />
        {/* Only for non admin users */}
        {userRole !== UserEnums.Role.Admin &&
          userRole !== UserEnums.Role.Owner && (
            <Checkbox
              label="editor rights"
              value={filterData.editorRights}
              onChangeFn={(value: boolean) =>
                handleFilterChange("editorRights", value)
              }
            />
          )}
        <StyledInputWrap>
          <FaSearch color={themeContext?.color.black} />
          <Input
            value={filterData.filter}
            placeholder="Filter by text"
            onChangeFn={(value: string) => handleFilterChange("filter", value)}
            changeOnType
            width="full"
          />
          {filterData.filter.length > 0 && (
            <StyledCancelButton>
              <MdCancel
                size={16}
                onClick={() => handleFilterChange("filter", "")}
              />
            </StyledCancelButton>
          )}
        </StyledInputWrap>
      </StyledFilterList>
    </StyledFilterWrap>
  );
};
