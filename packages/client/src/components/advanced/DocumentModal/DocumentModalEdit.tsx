import React, { useEffect, useState } from "react";

import { IDocument, IDocumentMeta, IResponseDocument } from "@shared/types";
import { Modal, ModalContent, ModalHeader } from "components";
import { useWindowSize } from "hooks/useWindowSize";
import { getShortLabelByLetterCount } from "utils/utils";
import TextAnnotator from "../Annotator/Annotator";
import AnnotatorProvider from "../Annotator/AnnotatorProvider";
import { Annotator } from "@inkvisitor/annotator/src/lib";
import { EntityEnums } from "@shared/enums";

interface DocumentModalEdit {
  document: IResponseDocument | IDocumentMeta | IDocument | undefined;
  onClose: () => void;
  anchor?: { entityId: string; occurence?: number };
}
const DocumentModalEdit: React.FC<DocumentModalEdit> = ({
  onClose,
  document,
  anchor,
}) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(true);
  }, []);
  const [windowWidth, windowHeight] = useWindowSize();

  // const [annotatorInitialized, setAnnotatorInitialized] = useState(false);

  return (
    <Modal width={1000} showModal={show} onClose={onClose} fullHeight>
      <ModalHeader
        title={`Edit ${
          document
            ? getShortLabelByLetterCount(document?.title, 90)
            : "no label"
        }`}
        onClose={onClose}
      />

      <ModalContent>
        {document ? (
          <AnnotatorProvider>
            <TextAnnotator
              documentId={document?.id}
              width={965}
              height={windowHeight - 180}
              displayLineNumbers={true}
              hlEntities={[EntityEnums.Class.Territory]}
              storedAnnotatorScroll={0}
              forwardAnnotator={(newAnnotator) => {
                // if (!annotatorInitialized && newAnnotator && anchor?.entityId) {
                anchor?.entityId &&
                  newAnnotator?.scrollToAnchor(
                    anchor?.entityId,
                    anchor?.occurence || 1
                  );
                // setAnnotatorInitialized(true);
                // }
              }}
              thisTerritoryEntityId={anchor?.entityId}
            />
          </AnnotatorProvider>
        ) : (
          <div>Document not found</div>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DocumentModalEdit;
