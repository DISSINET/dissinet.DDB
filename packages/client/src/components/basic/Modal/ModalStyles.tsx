import { animated } from "@react-spring/web";
import { IoClose } from "react-icons/io5";
import styled from "styled-components";
import { space2, space4, space5, space6, space7 } from "Theme/constants";
import { ThemeColor } from "Theme/theme";

interface ModalWrap {}
export const StyledModalWrap = styled.div<ModalWrap>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  z-index: 150;
`;
export const StyledBackground = styled(animated.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  background-color: ${({ theme }) => theme.color["modalBg"]};
`;

interface Card {
  width: "full" | "fat" | "normal" | "auto" | number;
  $fullHeight: boolean;
}
const getWidth = (width: "full" | "fat" | "normal" | "auto" | number) => {
  if (typeof width === "number") {
    return `${width / 10}rem`;
  } else {
    switch (width) {
      case "full":
        return "calc(100vw - 4rem)";
      case "normal":
        return "50rem";
      case "fat":
        return "100rem";
      case "auto":
        return "auto";
    }
  }
};
export const StyledCard = styled(animated.div)<Card>`
  width: ${({ width }) => getWidth(width)};
  height: ${({ $fullHeight }) => ($fullHeight ? "100%" : "")};
  display: flex;
  flex-direction: column;
  margin: ${({ theme }) => `0 ${theme.space[8]}`};
  max-height: calc(100vh - 8rem);
  z-index: 155;
  background-color: ${({ theme }) => theme.color["gray"][100]};
  color: ${({ theme }) => theme.color["black"]};
  border-radius: ${({ theme }) => theme.borderRadius["sm"]};
  position: relative;
`;

interface StyledCardHeader {
  $color?: keyof ThemeColor;
}
export const StyledCardHeader = styled.header<StyledCardHeader>`
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-shrink: 0;
  padding: ${space4} ${space6} ${space2} ${space6};
  background-color: ${({ theme, color }) =>
    color ? theme.color[color] : "transparent"};
  border-top-left-radius: ${({ theme }) => theme.borderRadius["sm"]};
  border-top-right-radius: ${({ theme }) => theme.borderRadius["sm"]};

  border-bottom-style: solid;
  border-bottom-width: ${({ theme }) => theme.borderWidth["default"]};
  border-bottom-color: ${({ theme }) => theme.color["gray"][400]};
  min-height: ${({ theme }) => theme.space[12]};
`;
export const StyledCardIcon = styled.div`
  font-size: 24;
  margin-right: 0.5rem;
`;
interface StyledCardTitle {
  $boldTitle?: boolean;
}
export const StyledCardTitle = styled.h2<StyledCardTitle>`
  font-weight: ${({ theme, $boldTitle }) =>
    $boldTitle ? theme.fontWeight["bold"] : theme.fontWeight["medium"]};
  font-size: ${({ theme }) => theme.fontSize["xl"]};
`;
interface StyledCardBody {
  $column?: boolean;
  $enableScroll: boolean;
  centered?: boolean;
}
export const StyledCardBody = styled.section<StyledCardBody>`
  display: flex;
  height: 100%;
  flex-direction: ${({ $column }) => ($column ? "column" : "row")};
  align-items: ${({ centered }) => (centered ? "center" : "")};
  justify-content: ${({ centered }) => (centered ? "center" : "")};
  padding: ${space5} ${space7};
  overflow: ${({ $enableScroll }) => ($enableScroll ? "auto" : "initial")};
  font-size: ${({ theme }) => theme.fontSize["sm"]};
`;
interface StyledFooter {
  $column?: boolean;
}
export const StyledFooter = styled.div<StyledFooter>`
  border-top-style: solid;
  border-top-width: ${({ theme }) => theme.borderWidth["default"]};
  border-top-color: ${({ theme }) => theme.color["gray"][400]};
  align-items: center;

  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  flex-direction: ${({ $column }) => ($column ? "column" : "row")};
  padding: ${({ theme }) => theme.space[4]};
`;

interface StyledModalInputForm {
  $alignLeft: boolean;
}
export const StyledModalInputForm = styled.div<StyledModalInputForm>`
  display: grid;
  grid-template-columns: ${({ $alignLeft }) =>
    $alignLeft ? "auto 1fr" : "auto auto"};
  grid-row-gap: ${({ theme }) => theme.space[1]};
`;
export const StyledModalInputLabel = styled.p`
  display: grid;
  justify-content: flex-end;
  align-items: center;
  margin-right: ${({ theme }) => theme.space[4]};
  white-space: nowrap;
`;
interface StyledModalInputWrap {
  width?: number;
}
export const StyledModalInputWrap = styled.div<StyledModalInputWrap>`
  width: ${({ width }) => (width ? `${width / 10}rem` : "auto")};
  display: grid;
  position: relative;
  margin-bottom: ${({ theme }) => theme.space[1]};
`;

export const StyledCloseIconWrap = styled.span`
  position: absolute;
  right: 1rem;
  padding: 0.3rem;
  cursor: pointer;
  border-radius: 5rem;
  transition: 0.3s;

  &:hover {
    background-color: ${({ theme }) => theme.color.closeBtnBackground};
  }
`;
export const StyledIoClose = styled(IoClose)`
  color: ${({ theme }) => theme.color["gray"][500]};
`;
