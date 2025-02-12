import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { FaPen, FaRegSave, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

import { Annotator, EditMode } from "@inkvisitor/annotator/src/lib";
import { EntityEnums } from "@shared/enums";
import { IDocument, IEntity, IResponseDocumentDetail } from "@shared/types";
import { Button } from "components/basic/Button/Button";
import { ButtonGroup } from "components/basic/ButtonGroup/ButtonGroup";
import { BsFileTextFill } from "react-icons/bs";
import { HiCodeBracket } from "react-icons/hi2";
import { ThemeContext } from "styled-components";
import { useAnnotator } from "./AnnotatorContext";
import TextAnnotatorMenu from "./AnnotatorMenu";
import {
  StyledAnnotatorMenu,
  StyledCanvasWrapper,
  StyledLinesCanvas,
  StyledMainCanvas,
  StyledScrollerCursor,
  StyledScrollerViewport,
} from "./AnnotatorStyles";
import { annotatorHighlight } from "./highlight";
import { useAppSelector } from "redux/hooks";

interface TextAnnotatorProps {
  width: number;
  height: number;
  displayLineNumbers: boolean;
  hlEntities?: EntityEnums.Class[];
  documentId: string;
  handleCreateStatement?: Function | undefined;
  handleCreateTerritory?: Function | undefined;
  initialScrollEntityId?: string | undefined;
  thisTerritoryEntityId?: string | undefined;

  forwardAnnotator?: (annotator: Annotator | undefined) => void;

  storedAnnotatorScroll?: number;
  setStoredAnnotatorScroll?: React.Dispatch<React.SetStateAction<number>>;
}

const W_SCROLL = 20;
const RATIO = 2;

export const TextAnnotator = ({
  width = 400,
  height = 500,
  displayLineNumbers = true,
  hlEntities = Object.values(EntityEnums.Class),
  documentId,
  handleCreateStatement = undefined,
  handleCreateTerritory = undefined,
  initialScrollEntityId = undefined,
  thisTerritoryEntityId = undefined,

  storedAnnotatorScroll = 0,
  forwardAnnotator = (undefined) => {},
  setStoredAnnotatorScroll = () => {},
}: TextAnnotatorProps) => {
  const queryClient = useQueryClient();
  const theme = useContext(ThemeContext);

  const contentHeight: number = useAppSelector(
    (state) => state.layout.contentHeight
  );

  const { annotator, setAnnotator } = useAnnotator();

  const [localTextContent, setLocalTextContent] = useState<string>("");

  useEffect(() => {
    return forwardAnnotator(undefined);
  }, []);

  const {
    data: dataDocument,
    error: errorDocument,
    isFetching: isFetchingDocument,
  } = useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const res = await api.documentGet(documentId);
      return res.data;
    },
    enabled: api.isLoggedIn(),
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async (data: { id: string; doc: Partial<IDocument> }) =>
      api.documentUpdate(data.id, data.doc),
    onSuccess: (variables, data) => {
      queryClient.invalidateQueries({ queryKey: ["document"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.info("Document content saved");
      setAnnotatorMode(EditMode.HIGHLIGHT);
    },
  });

  const updateDocumentMutationQuiet = useMutation({
    mutationFn: async (data: { id: string; doc: Partial<IDocument> }) =>
      api.documentUpdate(data.id, data.doc),
    onSuccess: (variables, data) => {
      queryClient.invalidateQueries({ queryKey: ["document"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const wLineNumbers = displayLineNumbers ? 50 : 0;
  const wTextArea = width - wLineNumbers - W_SCROLL;

  const [isSelectingText, setIsSelectingText] = useState<boolean>(false);

  const mainCanvas = useRef<HTMLCanvasElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLCanvasElement>(null);

  const [annotatorMode, setAnnotatorMode] = useState<EditMode>(
    EditMode.HIGHLIGHT
  );

  useEffect(() => {
    if (annotator) {
      annotator.setMode(annotatorMode);
    }
  }, [annotatorMode]);

  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedAnchors, setSelectedAnchors] = useState<string[]>([]);
  const storedEntities = useRef<Record<string, IEntity | false>>({});

  const [scrollAfterRefresh, setScrollAfterRefresh] = useState<
    number | undefined
  >(undefined);

  const handleSaveNewContent = (quiet: boolean) => {
    const scrollBeforeUpdated = annotator?.viewport?.lineStart;
    setScrollAfterRefresh(scrollBeforeUpdated);

    if (annotator && documentId) {
      if (quiet) {
        updateDocumentMutationQuiet.mutate({
          id: documentId,
          doc: {
            ...dataDocument,
            content: annotator.text.value,
          },
        });
      } else {
        updateDocumentMutation.mutate({
          id: documentId,
          doc: {
            ...dataDocument,
            content: annotator.text.value,
          },
        });
      }
    }
  };

  const fetchEntity = async (anchor: string) => {
    const entity = await api.entitiesGet(anchor);
    return entity;
  };

  const addEntityToStore = (eid: string, entity: IEntity | false) => {
    storedEntities.current[eid] = entity;
  };

  const obtainEntity = async (eid: string) => {
    if (Object.keys(storedEntities.current).includes(eid)) {
      return storedEntities.current[eid];
    } else {
      try {
        const entityRes = await fetchEntity(eid);
        if (entityRes && entityRes.data) {
          addEntityToStore(eid, entityRes.data);
          return entityRes.data;
        }
      } catch (error) {
        addEntityToStore(eid, false);
      }
    }
  };

  const handleTextSelection = async (text: string, anchors: string[]) => {
    if (annotatorMode === EditMode.HIGHLIGHT) {
      setSelectedText(text);
      setSelectedAnchors(anchors);

      for (const anchorI in anchors) {
        await obtainEntity(anchors[anchorI]);
      }

      if (thisTerritoryEntityId) {
        await obtainEntity(thisTerritoryEntityId);
      }
    }
  };

  const handleAddAnchor = (entityId: string) => {
    toast.info(`Anchor created ${entityId}.`);

    annotator?.addAnchor(entityId);
    setSelectedText("");
    handleSaveNewContent(true);
  };

  const refreshAnnotator = (scrollTo: { line?: number; anchor?: string }) => {
    if (!mainCanvas.current) {
      return;
    }

    const originalMode = annotatorMode;

    const newAnnotator = new Annotator(
      mainCanvas?.current,
      dataDocument?.content ?? "no text",
      RATIO
    );

    newAnnotator.fontColor = theme?.color.black;
    newAnnotator.bgColor = "transparent";

    newAnnotator.setSelectStyle("turquoise", 0.8);

    if (scroller?.current) {
      newAnnotator.addScroller(scroller.current);
    }

    if (displayLineNumbers && lines.current) {
      newAnnotator.addLines(lines.current);
    }

    newAnnotator.onSelectText(({ text, anchors }) => {
      handleTextSelection(text, anchors);
    });

    newAnnotator.onHighlight((entityId) => {
      if (dataDocument) {
        return annotatorHighlight(
          entityId,
          {
            thisTerritoryEntityId,
            dataDocument,
          },
          hlEntities,
          theme
        );
      }
    });

    newAnnotator.onTextChanged((text) => {
      setLocalTextContent(text);
    });
    newAnnotator.draw();

    setAnnotator(newAnnotator);
    forwardAnnotator(newAnnotator);

    newAnnotator.onScroll(() => {
      setStoredAnnotatorScroll(newAnnotator.viewport.lineStart);
    });

    setTimeout(() => {
      if (scrollTo.line) {
        newAnnotator.scrollToLine(scrollTo.line);
      } else if (scrollTo.anchor) {
        newAnnotator.scrollToAnchor(scrollTo.anchor);
      }
    }, 200);

    newAnnotator.setMode(originalMode);
  };

  useEffect(() => {
    if (!isFetchingDocument) {
      if (scrollAfterRefresh) {
        refreshAnnotator({
          line: scrollAfterRefresh,
        });
      } else {
        refreshAnnotator({
          line: storedAnnotatorScroll,
        });
      }
    }
  }, [isFetchingDocument, dataDocument]);

  useEffect(() => {
    if (!isFetchingDocument) {
      refreshAnnotator({
        line: storedAnnotatorScroll,
      });
    }
  }, [theme, isFetchingDocument]);

  useEffect(() => {
    if (!isFetchingDocument) {
      refreshAnnotator({
        line: storedAnnotatorScroll,
      });
    }
  }, [hlEntities]);

  useEffect(() => {
    if (mainCanvas.current) {
      if (storedAnnotatorScroll) {
        refreshAnnotator({
          line: storedAnnotatorScroll,
        });
      } else if (initialScrollEntityId) {
        refreshAnnotator({
          anchor: initialScrollEntityId,
        });
      }
    }
  }, [initialScrollEntityId, mainCanvas.current]);

  // check if the selection is in the first half of the viewport
  const menuSelectionPosition = useMemo<"top" | "bottom" | "both">(() => {
    const vStart = annotator?.viewport?.lineStart ?? 0;
    const yEnd = (annotator?.cursor?.selectEnd?.yLine ?? 0) - vStart;
    const yStart = (annotator?.cursor?.selectStart?.yLine ?? 0) - vStart;

    const allLines = annotator?.viewport.noLines ?? 0;

    const yCenter = yStart && yEnd ? (yStart + yEnd) / 2 : 0;
    const viewportMiddle = allLines / 2;
    console.log(viewportMiddle);

    // if the selection is spanning through both halves of the viewport
    if (
      (yStart < viewportMiddle && yEnd > viewportMiddle) ||
      (yEnd < viewportMiddle && yStart > viewportMiddle)
    ) {
      return "both";
    }

    return yCenter < viewportMiddle ? "top" : "bottom";
  }, [
    annotator?.cursor?.selectEnd?.yLine,
    annotator?.cursor?.selectStart?.yLine,
    annotator?.viewport.noLines,
  ]);

  const isSelectionTopDown = useMemo<boolean>(() => {
    const vStart = annotator?.viewport?.lineStart ?? 0;
    const yEnd = (annotator?.cursor?.selectEnd?.yLine ?? 0) - vStart;
    const yStart = (annotator?.cursor?.selectStart?.yLine ?? 0) - vStart;

    return yEnd >= yStart;
  }, [
    annotator?.cursor?.selectEnd?.yLine,
    annotator?.cursor?.selectStart?.yLine,
  ]);

  const translateMenu = useMemo<string>(() => {
    if (menuSelectionPosition === "top") {
      return "0%";
    } else if (menuSelectionPosition === "bottom") {
      return "-100%";
    } else {
      if (isSelectionTopDown) {
        return "-100%";
      } else {
        return "0%";
      }
    }
  }, [menuSelectionPosition, isSelectionTopDown]);

  const menuPositionY = useMemo<number>(() => {
    const vStart = annotator?.viewport?.lineStart ?? 0;

    const yStart = (annotator?.cursor?.selectStart?.yLine ?? 0) - vStart;
    const yEnd = (annotator?.cursor?.selectEnd?.yLine ?? 0) - vStart;

    const lineHeight = (annotator?.lineHeight ?? 0) / RATIO;

    let menuYD = 0;
    if (menuSelectionPosition === "top") {
      menuYD = 2 * lineHeight;
    } else if (menuSelectionPosition === "bottom") {
      menuYD = -lineHeight;
    } else {
      if (isSelectionTopDown) {
        menuYD = -lineHeight;
      } else {
        menuYD = 4 * lineHeight;
      }
    }
    // large
    // if the selection is top-down or bottom-up

    // if end is before start + menuSelectionPosition is true, then the menu should be above the cursor...
    // top-down + large => menu below end
    // top-down + top => menu below end
    // top-down + bottom => menu above start
    // bottom-up + top => menu below start
    // bottom-up + bottom => menu above end

    if (isSelectionTopDown) {
      if (menuSelectionPosition === "top") {
        return yEnd * lineHeight + menuYD;
      } else if (menuSelectionPosition === "bottom") {
        return yStart * lineHeight + menuYD;
      } else {
        return yEnd * lineHeight;
      }
    } else {
      if (menuSelectionPosition === "top") {
        return yStart * lineHeight + menuYD;
      } else if (menuSelectionPosition === "bottom") {
        return yEnd * lineHeight + menuYD;
      } else {
        return yEnd * lineHeight + menuYD;
      }
    }
  }, [annotator?.cursor?.yLine, annotator?.lineHeight, menuSelectionPosition]);

  const isChangeMade = useMemo<boolean>(() => {
    return annotator?.text?.value !== dataDocument?.content;
  }, [annotator?.text?.value, dataDocument?.content, localTextContent]);

  const onCreateTerritory = () => {
    if (handleCreateTerritory && selectedText) {
      const newTerritoryId = uuidv4();
      handleAddAnchor(newTerritoryId);
      handleCreateTerritory(newTerritoryId);
      handleSaveNewContent(true);
    }
  };

  const onCreateStatement = () => {
    if (handleCreateStatement && selectedText) {
      const newStatementId = uuidv4();
      handleAddAnchor(newStatementId);
      // remove linebreaks from text
      const validatedText = selectedText.replace(/\n/g, " ");
      handleCreateStatement(validatedText, newStatementId);
      handleSaveNewContent(true);
    }
  };

  const onRemoveAnchor = (anchor: string) => {
    annotator?.removeAnchorFromSelection(anchor);
    handleSaveNewContent(true);
  };

  const isMenuDisplayed = useMemo<boolean>(() => {
    return (
      annotatorMode === EditMode.HIGHLIGHT &&
      selectedText !== "" &&
      !isSelectingText &&
      dataDocument !== undefined
    );
  }, [annotatorMode, selectedText, isSelectingText, dataDocument]);

  if (errorDocument) {
    return <div>Error loading document: {errorDocument.message}</div>;
  }

  if (isFetchingDocument) {
    return <div>Loading document...</div>;
  }

  return (
    <div
      style={{ width: width, position: "absolute" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setSelectedText("");
        }
      }}
    >
      <StyledCanvasWrapper>
        {isMenuDisplayed && (
          <StyledAnnotatorMenu
            $top={
              menuPositionY + 300 > contentHeight
                ? contentHeight / 2
                : menuPositionY
            }
            $left={100}
            // $translateY={"100%"}
            $translateY={translateMenu}
          >
            <TextAnnotatorMenu
              anchors={selectedAnchors}
              documentData={dataDocument as IResponseDocumentDetail}
              text={selectedText}
              entities={storedEntities.current}
              onAnchorAdd={handleAddAnchor}
              handleCreateTerritory={onCreateTerritory}
              handleCreateStatement={onCreateStatement}
              handleRemoveAnchor={onRemoveAnchor}
              thisTerritoryEntityId={thisTerritoryEntityId}
              canCreateActiveTAnchor={
                !dataDocument?.referencedEntityIds.T.includes(
                  thisTerritoryEntityId ?? ""
                )
              }
            />
          </StyledAnnotatorMenu>
        )}

        {displayLineNumbers && (
          <StyledLinesCanvas
            ref={lines}
            width={wLineNumbers}
            height={height}
            style={{
              outline: "none",
              backgroundColor: theme?.color.white,
              color: theme?.color.plain,
            }}
          />
        )}

        <StyledMainCanvas
          onMouseDown={() => setIsSelectingText(true)}
          onMouseUp={() => setIsSelectingText(false)}
          tabIndex={0}
          ref={mainCanvas}
          id="statement-list-annotator-mainCanvas"
          style={{
            height: height,
            width: wTextArea,
            backgroundColor: theme?.color.white,
            color: theme?.color.text,
            outline: "none",
          }}
        />
        <StyledScrollerViewport
          ref={scroller}
          style={{
            background: theme?.color.grey,
          }}
        >
          <StyledScrollerCursor
            style={{
              backgroundColor: theme?.color.primary,
            }}
          />
        </StyledScrollerViewport>
      </StyledCanvasWrapper>

      {annotator && (
        <ButtonGroup $marginTop>
          <Button
            key={EditMode.HIGHLIGHT}
            icon={<FaPen size={11} />}
            label={EditMode.HIGHLIGHT}
            color="success"
            inverted={annotatorMode !== EditMode.HIGHLIGHT}
            onClick={() => {
              annotator.setMode(EditMode.HIGHLIGHT);
              setAnnotatorMode(EditMode.HIGHLIGHT);
              annotator.draw();
            }}
            tooltipLabel="activate syntax highlighting mode"
          />
          <Button
            key={EditMode.SEMI}
            icon={<BsFileTextFill size={11} />}
            color="success"
            label="text edit"
            inverted={annotatorMode !== EditMode.SEMI}
            onClick={() => {
              annotator.setMode(EditMode.SEMI);
              setAnnotatorMode(EditMode.SEMI);
              annotator.draw();
            }}
            tooltipLabel="activate semi mode"
          />
          <Button
            key={EditMode.RAW}
            icon={<HiCodeBracket size={11} />}
            color="success"
            label="XML"
            inverted={annotatorMode !== EditMode.RAW}
            onClick={() => {
              annotator.setMode(EditMode.RAW);
              setAnnotatorMode(EditMode.RAW);
              annotator.draw();
            }}
            tooltipLabel="activate edit mode"
          />

          <Button
            label="save edits"
            color="primary"
            icon={<FaRegSave />}
            disabled={!isChangeMade}
            onClick={() => {
              handleSaveNewContent(false);
            }}
          />
          <Button
            label="discard changes"
            color="warning"
            icon={<FaTrash />}
            disabled={!isChangeMade}
            onClick={() => {
              if (dataDocument?.content) {
                annotator?.updateText(dataDocument?.content);
              }
            }}
          />
        </ButtonGroup>
      )}
    </div>
  );
};

export default TextAnnotator;
