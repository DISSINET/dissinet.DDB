import styled from "styled-components";

interface StyledWrap {}
export const StyledWrap = styled.div<StyledWrap>`
  display: flex;
  justify-content: center;
  align-items: center;
`;
interface StyledPropButtonGroup {
  $leftMargin?: boolean;
  $rightMargin?: boolean;
  $border?: boolean;
  width?: number;
  padding?: boolean;
}
export const StyledPropButtonGroup = styled.div<StyledPropButtonGroup>`
  margin-left: ${({ theme, $leftMargin }) =>
    $leftMargin ? theme.space[3] : theme.space[0]};
  margin-right: ${({ theme, $rightMargin }) =>
    $rightMargin ? theme.space[3] : theme.space[0]};
  vertical-align: middle;
  display: inline-flex;
  border-radius: 8px;
  border: ${({ $border }) => ($border ? "1px" : 0)} solid
    ${({ theme }) => theme.color["gray"][600]};
  max-width: fit-content;
`;

interface StyledButtonWrap {
  $leftMargin?: boolean;
  $rightMargin?: boolean;
}
export const StyledButtonWrap = styled.div<StyledButtonWrap>`
  margin-left: ${({ theme, $leftMargin }) =>
    $leftMargin ? theme.space[3] : theme.space[0]};
  margin-right: ${({ theme, $rightMargin }) =>
    $rightMargin ? theme.space[3] : theme.space[0]};
`;
