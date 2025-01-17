import styled from "styled-components";

interface StyledBorderLeft {
  $active: boolean;
}
export const StyledBorderLeft = styled.div<StyledBorderLeft>`
  border-left: ${({ theme, $active }) =>
    $active
      ? `${theme.borderWidth[4]} solid`
      : `${theme.borderWidth[2]} solid`};
  border-left-color: ${({ theme, $active }) =>
    $active ? theme.color.primary : theme.color.greyer};

  padding-left: 1rem;
  padding-right: 2rem;
`;

export const StyledNotActiveTag = styled.div`
  color: ${({ theme }) => theme.color["white"]};
  font-size: ${({ theme }) => theme.fontSize["xs"]};
  font-weight: ${({ theme }) => theme.fontWeight["light"]};
  background-color: ${({ theme }) => theme.color["greyer"]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  margin-bottom: ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.borderRadius["sm"]};
  width: fit-content;
`;
export const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  grid-gap: 1rem;
`;
export const StyledSentence = styled.p<{ $active: boolean }>`
  margin-top: 0.1rem;
  font-size: ${({ theme }) => theme.fontSize["xs"]};
  color: ${({ theme, $active }) =>
    $active ? theme.color.primary : theme.color.greyer};
  &:before: {
    content: '"';
  }
  &:after: {
    content: '"';
  }
`;
export const StyledSentenceEntity = styled.span`
  font-weight: bold;
`;

export const StyledLabel = styled.div`
  display: grid;
  text-align: right;
  align-items: start;
  margin-top: 0.2rem;
  color: ${({ theme }) => theme.color["info"]};
  font-size: ${({ theme }) => theme.fontSize["xs"]};
`;
export const StyledValue = styled.div`
  display: grid;
  align-items: center;
`;
export const StyledFlexList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
`;

export const StyledLanguageList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[2]};
`;
