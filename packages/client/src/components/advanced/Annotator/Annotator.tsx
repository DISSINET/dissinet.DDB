import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { FaPen, FaRegSave, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

import { Annotator, Modes } from "@inkvisitor/annotator/src/lib";
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

interface TextAnnotatorProps {
  width: number;
  height: number;
  displayLineNumbers: boolean;
  documentId: string;
  handleCreateStatement?: Function | undefined;
  handleCreateTerritory?: Function | undefined;
  initialScrollEntityId?: string | undefined;
  thisTerritoryEntityId?: string | undefined;

  forwardAnnotator?: (annotator: Annotator | undefined) => void;

  storedAnnotatorScroll: number;
  setStoredAnnotatorScroll?: React.Dispatch<React.SetStateAction<number>>;
}

const W_SCROLL = 20;
const RATIO = 2;

export const TextAnnotator = ({
  width = 400,
  height = 500,
  displayLineNumbers = true,
  documentId,
  handleCreateStatement = undefined,
  handleCreateTerritory = undefined,
  initialScrollEntityId = undefined,
  thisTerritoryEntityId = undefined,

  storedAnnotatorScroll,
  forwardAnnotator = (undefined) => {},
  setStoredAnnotatorScroll = () => {},
}: TextAnnotatorProps) => {
  const queryClient = useQueryClient();
  const theme = useContext(ThemeContext);

  const { annotator, setAnnotator } = useAnnotator();

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
      setAnnotatorMode(Modes.HIGHLIGHT);
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

  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isSelectingText, setIsSelectingText] = useState<boolean>(false);

  const mainCanvas = useRef<HTMLCanvasElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLCanvasElement>(null);

  const [annotatorMode, setAnnotatorMode] = useState<Modes>(Modes.HIGHLIGHT);

  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedAnchors, setSelectedAnchors] = useState<string[]>([]);
  const storedEntities = useRef<Record<string, IEntity | false>>({});

  const [scrollAfterRefresh, setScrollAfterRefresh] = useState<
    number | undefined
  >(undefined);

  const handleSaveNewContent = (quiet: boolean) => {
    const scrollBeforeUpdate = annotator?.viewport?.lineStart;
    setScrollAfterRefresh(scrollBeforeUpdate);

    if (annotator && documentId) {
      if (quiet) {
        updateDocumentMutationQuiet.mutate({
          id: documentId,
          doc: {
            ...{ document: dataDocument },
            ...{ content: annotator.text.value },
          },
        });
      } else {
        updateDocumentMutation.mutate({
          id: documentId,
          doc: {
            ...{ document: dataDocument },
            ...{ content: annotator.text.value },
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
    if (annotatorMode === Modes.HIGHLIGHT) {
      setSelectedText(text);
      setSelectedAnchors(anchors);

      for (const anchorI in anchors) {
        await obtainEntity(anchors[anchorI]);
      }
    }
  };

  const handleAddAnchor = (entityId: string) => {
    toast.info(
      `Anchor created ${entityId}. Do not forget to save the document.`
    );
    annotator?.addAnchor(entityId);
    setSelectedText("");
    handleSaveNewContent(true);
  };

  const refreshAnnotator = () => {
    if (!mainCanvas.current) {
      return;
    }

    const newAnnotator = new Annotator(
      mainCanvas?.current,
      dataDocument?.content ?? "no text",
      RATIO
    );

    newAnnotator.scrollToLine(0);

    newAnnotator.setMode(Modes.HIGHLIGHT);
    if (scroller?.current) {
      newAnnotator.addScroller(scroller.current);
    }

    newAnnotator.cursor.setStyle({
      selection: {
        fill: theme?.color.success,
        fillOpacity: 0.3,
      },
      cursor: {
        highlightFill: theme?.color.primary,
        defaultFill: theme?.color.primary,
      },
    });

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
          theme
        );
      }
    });

    newAnnotator.onTextChanged((text) => {});
    newAnnotator.draw();

    setAnnotator(newAnnotator);
    forwardAnnotator(newAnnotator);

    if (newAnnotator && newAnnotator.viewport) {
      if (!isInitialized) {
        newAnnotator?.scrollToLine(storedAnnotatorScroll);
        if (initialScrollEntityId) {
          newAnnotator.scrollToAnchor(initialScrollEntityId);

          // rescroll if the scroll stored
          if (storedAnnotatorScroll) {
            newAnnotator?.scrollToLine(storedAnnotatorScroll);
          }
        }

        setIsInitialized(true);
      }
    }

    newAnnotator.onScroll(() => {
      setStoredAnnotatorScroll(newAnnotator.viewport.lineStart);
    });

    if (scrollAfterRefresh) {
      newAnnotator.viewport.scrollTo(
        scrollAfterRefresh,
        newAnnotator.text.lines.length
      );
      setScrollAfterRefresh(undefined);
    }
  };

  useEffect(() => {
    if (!isFetchingDocument) {
      refreshAnnotator();
    }
  }, [isFetchingDocument, dataDocument, theme]);

  useEffect(() => {
    setIsInitialized(false);
    refreshAnnotator();
  }, [initialScrollEntityId]);

  // check if the selection is in the first half of the viewportr
  const isTopSelection = useMemo<boolean>(() => {
    const vStart = annotator?.viewport?.lineStart ?? 0;
    const yEnd = (annotator?.cursor?.selectEnd?.yLine ?? 0) - vStart;
    const yStart = (annotator?.cursor?.selectStart?.yLine ?? 0) - vStart;

    const allLines = annotator?.viewport.noLines ?? 0;

    const yCenter = yStart && yEnd ? (yStart + yEnd) / 2 : 0;
    const viewportMiddle = allLines / 2;

    return yCenter < viewportMiddle;
  }, [
    annotator?.cursor?.selectEnd?.yLine,
    annotator?.cursor?.selectStart?.yLine,
    annotator?.viewport.noLines,
  ]);

  const menuPositionY = useMemo<number>(() => {
    const vStart = annotator?.viewport?.lineStart ?? 0;

    const yStart = (annotator?.cursor?.selectStart?.yLine ?? 0) - vStart;
    const yEnd = (annotator?.cursor?.selectEnd?.yLine ?? 0) - vStart;

    const lineHeight = (annotator?.lineHeight ?? 0) / RATIO;

    const menuYD = isTopSelection ? 2 * lineHeight : -lineHeight;

    // if the selection is top-down or bottom-up
    const isEndAfterStart = yEnd && yStart && yEnd >= yStart;

    // if end is before start + isTopSelection is true, then the menu should be above the cursor...
    // top-down + top => menu below end
    // top-down + bottom => menu above start
    // bottom-up + top => menu below start
    // bottom-up + bottom => menu above end

    if (isEndAfterStart) {
      if (isTopSelection) {
        return yEnd * lineHeight + menuYD;
      } else {
        return yStart * lineHeight + menuYD;
      }
    } else {
      if (isTopSelection) {
        return yStart * lineHeight + menuYD;
      } else {
        return yEnd * lineHeight + menuYD;
      }
    }
  }, [annotator?.cursor?.yLine, annotator?.lineHeight, isTopSelection]);

  const isChangeMade = useMemo<boolean>(() => {
    return annotator?.text?.value !== dataDocument?.content;
  }, [annotator?.text?.value, dataDocument?.content]);

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
      annotatorMode === Modes.HIGHLIGHT &&
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
    <div style={{ width: width, position: "absolute" }}>
      <StyledCanvasWrapper>
        {isMenuDisplayed && (
          <StyledAnnotatorMenu
            $top={menuPositionY}
            $left={100}
            // $translateY={"100%"}
            $translateY={isTopSelection ? "0%" : "-100%"}
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
        <ButtonGroup>
          <Button
            key={Modes.HIGHLIGHT}
            icon={<FaPen size={11} />}
            label={Modes.HIGHLIGHT}
            color="success"
            inverted={annotatorMode !== Modes.HIGHLIGHT}
            onClick={() => {
              annotator.setMode(Modes.HIGHLIGHT);
              setAnnotatorMode(Modes.HIGHLIGHT);
              annotator.draw();
            }}
            tooltipLabel="activate syntax highlighting mode"
          />
          <Button
            key={Modes.SEMI}
            icon={<BsFileTextFill size={11} />}
            color="success"
            label="text edit"
            inverted={annotatorMode !== Modes.SEMI}
            onClick={() => {
              annotator.setMode(Modes.SEMI);
              setAnnotatorMode(Modes.SEMI);
              annotator.draw();
            }}
            tooltipLabel="activate semi mode"
          />
          <Button
            key={Modes.RAW}
            icon={<HiCodeBracket size={11} />}
            color="success"
            label="XML"
            inverted={annotatorMode !== Modes.RAW}
            onClick={() => {
              annotator.setMode(Modes.RAW);
              setAnnotatorMode(Modes.RAW);
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
              refreshAnnotator();
            }}
          />
        </ButtonGroup>
      )}
    </div>
  );
};

export default TextAnnotator;
