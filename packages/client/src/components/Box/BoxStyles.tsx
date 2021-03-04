import styled from "styled-components";
import { space4 } from "Theme/constants";

interface IBoxStyle {
  color: string;
  width: number;
  height: number;
}
export const StyledBox = styled.div<IBoxStyle>`
  position: relative;
  display: flex;
  flex-direction: column;
  border-color: ${({ theme, color }) => theme.colors[color]};
  border-style: solid;
  border-width: ${({ theme }) => theme.borderWidths[2]};
  width: ${({ width }) => `${width / 10}rem`};
  height: ${({ height }) => (height ? `${height / 10}rem` : "100%")};
`;
interface Head {
  color: string;
}
export const Head = styled.div<Head>`
  background-color: ${({ theme, color }) => theme.colors[color]};
  color: ${({ theme }) => theme.colors["white"]};
  font-weight: ${({ theme }) => theme.fontWeights["bold"]};
  padding: ${space4};
  font-size: ${({ theme }) => theme.fontSizes["lg"]};
  line-height: 2.8rem;
  /* font-family: muni; */
`;
export const Content = styled.div`
  background-color: ${({ theme }) => theme.colors["white"]};
  padding: ${space4};
  display: flex;
  flex-direction: column;
  overflow: auto;
  height: 100%;
  font-size: ${({ theme }) => theme.fontSizes["sm"]};
`;
