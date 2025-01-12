import React from "react";

import { IEntity, IResponseDocument } from "@shared/types";
import { Button } from "components/basic/Button/Button";
import { BsSegmentedNav } from "react-icons/bs";
import { FaClipboard, FaPlus } from "react-icons/fa";
import { TbAnchor } from "react-icons/tb";
import theme from "Theme/theme";
import { classesAnnotator } from "types";
import { EntitySuggester } from "../EntitySuggester/EntitySuggester";
import { EntityTag } from "../EntityTag/EntityTag";
import {
  StyledAnnotatorAnchorList,
  StyledAnnotatorItem,
  StyledAnnotatorItemContent,
  StyledAnnotatorItemTitle,
} from "./AnnotatorStyles";
import { toast } from "react-toastify";

interface TextAnnotatorMenuProps {
  text: string;
  documentData: IResponseDocument;
  anchors: string[];
  entities: Record<string, IEntity | false>;
  onAnchorAdd: (entityId: string) => void;
  handleCreateStatement: Function | false;
  handleCreateTerritory: Function | false;
  handleRemoveAnchor: Function | false;
  thisTerritoryEntityId: string | undefined;
  canCreateActiveTAnchor: boolean;
}

export const TextAnnotatorMenu = ({
  text,
  anchors,
  entities,
  onAnchorAdd,
  handleCreateStatement = false,
  handleCreateTerritory = false,
  handleRemoveAnchor = false,
  thisTerritoryEntityId,
  canCreateActiveTAnchor,
}: TextAnnotatorMenuProps) => {
  return (
    <>
      <StyledAnnotatorItem>
        <StyledAnnotatorItemTitle>Actions</StyledAnnotatorItemTitle>
        <StyledAnnotatorItemContent>
          <Button
            icon={<BsSegmentedNav size={22} />}
            color="primary"
            onClick={() => {
              console.log("Segment selection into Statements");
            }}
            label={"Segment"}
            tooltipLabel="Segment selection into Statements"
            disabled
          />
          <Button
            icon={<FaClipboard size={16} />}
            color="primary"
            onClick={() => {
              navigator.clipboard.writeText(text);
              toast.info("text copied to clipboard");
            }}
            label={"Copy text"}
            tooltipLabel="copy selected text into clipboard"
          />
        </StyledAnnotatorItemContent>
      </StyledAnnotatorItem>
      <StyledAnnotatorItem>
        <StyledAnnotatorItemContent>
          {canCreateActiveTAnchor &&
            thisTerritoryEntityId &&
            entities[thisTerritoryEntityId] && (
              <div style={{ display: "flex", gap: theme.space[2] }}>
                <Button
                  label="Active territory"
                  icon={<TbAnchor size={15} />}
                  color="primary"
                  onClick={() => {
                    onAnchorAdd(thisTerritoryEntityId);
                  }}
                  tooltipLabel="Create anchor for active territory"
                />
                <EntityTag
                  entity={entities[thisTerritoryEntityId] as IEntity}
                />
              </div>
            )}
        </StyledAnnotatorItemContent>
        <StyledAnnotatorItemContent>
          {handleCreateStatement && (
            <Button
              icon={
                <>
                  <FaPlus size={12} style={{}} />
                  <TbAnchor size={15} />
                </>
              }
              color="primary"
              onClick={() => {
                handleCreateStatement();
              }}
              label="Statement"
              tooltipLabel="Create new Statement from selection"
            />
          )}
          {handleCreateTerritory && (
            <Button
              icon={
                <>
                  <FaPlus size={12} style={{}} />
                  <TbAnchor size={15} />
                </>
              }
              color="primary"
              onClick={() => {
                handleCreateTerritory();
              }}
              label="Territory"
              tooltipLabel="Create new sub-territory from selection"
            />
          )}
          <EntitySuggester
            categoryTypes={classesAnnotator}
            initTyped={text.length > 30 ? text.substring(0, 30) : text}
            onSelected={(newAnchorId) => {
              onAnchorAdd(newAnchorId);
            }}
            inputWidth={200}
            openDetailOnCreate
          />
        </StyledAnnotatorItemContent>
      </StyledAnnotatorItem>
      <StyledAnnotatorItem>
        <StyledAnnotatorItemTitle>
          Anchors in selection
        </StyledAnnotatorItemTitle>
        <StyledAnnotatorItemContent>
          <StyledAnnotatorAnchorList>
            {anchors.map((anchor) => {
              if (entities[anchor]) {
                return (
                  <EntityTag
                    unlinkButton={{
                      onClick: () => {
                        if (handleRemoveAnchor) {
                          handleRemoveAnchor(anchor);
                        }
                      },
                    }}
                    key={anchor}
                    entity={entities[anchor] as IEntity}
                  />
                );
              } else {
                return <React.Fragment key={anchor} />;
              }
            })}
          </StyledAnnotatorAnchorList>
        </StyledAnnotatorItemContent>
      </StyledAnnotatorItem>
    </>
  );
};

export default TextAnnotatorMenu;
