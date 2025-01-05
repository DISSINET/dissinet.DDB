import {
  IDocument,
  IResponseDocument,
  IResponseDocumentDetail,
  IResponseGeneric,
} from "@shared/types";
import {
  BadParams,
  DocumentDoesNotExist,
  InternalServerError,
  ModelNotValidError,
  PermissionDeniedError,
} from "@shared/types/errors";
import { Router } from "express";
import { asyncRouteHandler } from "../index";
import { mergeDeep } from "@common/functions";
import { IRequest } from "src/custom_typings/request";
import Document from "@models/document/document";
import ResponseDocument from "@models/document/response";
import { EntityEnums } from "@shared/enums";

export default Router()
  /**
   * @openapi
   * /documents/:
   *   get:
   *     description: Returns list of filtered documents entries
   *     tags:
   *       - documents
   *     parameters:
   *       - in: query
   *         name: search params
   *         schema:
   *           $ref: "#/components/schemas/IRequestDocument"
   *         required: true
   *         description: search options for the query
   *         style: form
   *         explode: true
   *     responses:
   *       200:
   *         description: Returns list of documents entries
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: "#/components/schemas/IResponseDocument"
   */
  .get(
    "/",
    asyncRouteHandler<IResponseDocument[]>(async (request: IRequest) => {
      const docs = await Document.getAll(request.db.connection);

      const docResponses = [];
      for (const d of docs) {
        const document = new ResponseDocument(d);
        await document.populateWithEntities(request.db.connection);
        docResponses.push(document);
      }

      return docResponses;
    })
  )

  .post("/export", async (request: IRequest, res: any) => {
    const id = request.body.documentId;
    const exportedEntities = request.body
      .exportedEntities as EntityEnums.Class[];

    if (!id) {
      throw new BadParams("document id has to be set");
    }

    console.log("EXPORTING");

    const existing = await Document.getDocumentById(request.db.connection, id);

    if (!existing) {
      throw DocumentDoesNotExist.forId(id);
    }

    const document = new ResponseDocument(existing);
    await document.populateWithEntities(request.db.connection);

    // Search document for anchors <entityId>text</entityId>
    // Anchors with entityId that are not in exportedEntities should be removed
    // When removing the anchors, the text between the anchors should be kept
    //
    const filteredContent = document.content.replace(/<[^<>]+>/g, (match) => {
      // remove <, >, and / from the match
      const entityId = match.slice(1, -1).replace("/", "");
      let validEntityClass = false;
      exportedEntities.forEach((entityClass) => {
        document.referencedEntityIds[entityClass].forEach((id) => {
          if (id === entityId) {
            validEntityClass = true;
          }
        });
      });

      if (validEntityClass) {
        return match;
      } else {
        // return the text inbetween the anchors
        return "";
      }
    });

    // TODO: filtering of anchors should happen here

    res.setHeader("content-type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="export.txt"`);
    res.send(filteredContent);
  })
  /**
   * @openapi
   * /documents/{documentId}:
   *   put:
   *     description: Retrieves an existing document entry
   *     tags:
   *       - documents
   *     parameters:
   *       - in: path
   *         name: documentId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the document entry
   *     requestBody:
   *       description: Document object
   *       content:
   *         application/json:
   *           schema:
   *             allOf:
   *               - $ref: "#/components/schemas/IDocument"
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseDocumentDetail"
   */
  .get(
    "/:documentId?",
    asyncRouteHandler<IResponseDocumentDetail>(async (request: IRequest) => {
      const id = request.params.documentId;

      if (!id) {
        throw new BadParams("document id has to be set");
      }

      const existing = await Document.getDocumentById(
        request.db.connection,
        id
      );

      if (!existing) {
        throw DocumentDoesNotExist.forId(id);
      }

      const document = new ResponseDocument(existing);
      await document.populateWithEntities(request.db.connection);
      return document;
    })
  )
  /**
   * @openapi
   * /documents/:
   *   post:
   *     description: Create a new entity entry
   *     tags:
   *       - entities
   *     requestBody:
   *       description: Entity object
   *       content:
   *         application/json:
   *           schema:
   *             allOf:
   *               - $ref: "#/components/schemas/IEntity"
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .post(
    "/",
    asyncRouteHandler<IResponseGeneric>(async (request: IRequest) => {
      console.log("before model");
      const model = new Document(request.body as Record<string, unknown>);
      console.log("after model", model);

      if (!model.isValid()) {
        throw new ModelNotValidError("");
      }

      if (!model.canBeCreatedByUser(request.getUserOrFail())) {
        throw new PermissionDeniedError("document cannot be created");
      }

      await request.db.lock();

      const saved = await model.save(request.db.connection);
      if (!saved) {
        throw new InternalServerError("cannot create document");
      }

      const out: IResponseGeneric = { result: true };

      return out;
    })
  )
  /**
   * @openapi
   * /documents/{documentId}:
   *   put:
   *     description: Update an existing document entry
   *     tags:
   *       - documents
   *     parameters:
   *       - in: path
   *         name: documentId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the document entry
   *     requestBody:
   *       description: Document object
   *       content:
   *         application/json:
   *           schema:
   *             allOf:
   *               - $ref: "#/components/schemas/IDocument"
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .put(
    "/:documentId",
    asyncRouteHandler<IResponseGeneric>(async (request: IRequest) => {
      const documentId = request.params.documentId;
      const documentData = request.body as Record<string, unknown>;

      // not validation, just required data for this operation
      if (
        !documentId ||
        !documentData ||
        Object.keys(documentData).length === 0
      ) {
        throw new BadParams("document id and data have to be set");
      }

      await request.db.lock();

      // documentId must be already in the db
      const existingDocument = await Document.getDocumentById(
        request.db.connection,
        documentId
      );
      if (!existingDocument) {
        throw DocumentDoesNotExist.forId(documentId);
      }

      // get correct IDbModel implementation
      const model = new Document({
        ...mergeDeep(existingDocument, documentData),
        id: documentId,
      });

      // checking the validity of the final model (already has updated data)
      if (!model.isValid()) {
        throw new ModelNotValidError("");
      }

      if (!model.canBeEditedByUser(request.getUserOrFail())) {
        throw new PermissionDeniedError("document cannot be saved");
      }

      const result = await model.update(request.db.connection, model);

      if (result.replaced || result.unchanged) {
        return {
          result: true,
        };
      } else {
        throw new InternalServerError(`cannot update document ${documentId}`);
      }
    })
  )
  /**
   * @openapi
   * /documents/{documentId}:
   *   delete:
   *     description: Delete a document entry
   *     tags:
   *       - documents
   *     parameters:
   *       - in: path
   *         name: documentId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the document entry
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .delete(
    "/:documentId",
    asyncRouteHandler<IResponseGeneric>(async (request: IRequest) => {
      const id = request.params.documentId;
      if (!id) {
        throw new BadParams("document id has to be set");
      }

      await request.db.lock();

      const existing = await Document.getDocumentById(
        request.db.connection,
        id
      );
      if (!existing) {
        throw DocumentDoesNotExist.forId(id);
      }

      if (!existing.canBeDeletedByUser(request.getUserOrFail())) {
        throw new PermissionDeniedError(
          "document cannot be deleted by current user"
        );
      }

      const result = await existing.delete(request.db.connection);

      if (result.deleted === 1) {
        return {
          result: true,
        };
      } else {
        throw new InternalServerError(`cannot delete document ${id}`);
      }
    })
  )
  .patch(
    "/:documentId/removeAnchors",
    asyncRouteHandler<IResponseGeneric>(
      async (
        request: IRequest<{ documentId: string }, unknown, { entityId: string }>
      ) => {
        const id = request.params.documentId;
        if (!id) {
          throw new BadParams("document id has to be set");
        }

        await request.db.lock();

        const existing = await Document.getDocumentById(
          request.db.connection,
          id
        );
        if (!existing) {
          throw DocumentDoesNotExist.forId(id);
        }

        let entityIds: string[] | string = request.query.entityId;
        existing.removeAnchors(
          typeof entityIds === "object" ? entityIds : [entityIds]
        );

        const result = await existing.update(request.db.connection, {
          content: existing.content,
          entityIds: existing.entityIds,
        });

        return {
          result: !!result.replaced,
        };
      }
    )
  )
  .patch(
    "/:documentId/removeAnchor",
    asyncRouteHandler<IResponseGeneric<any>>(
      async (
        request: IRequest<
          { documentId: string },
          { entityId: string; anchorText: string; anchorIndex: number }
        >
      ) => {
        const id = request.params.documentId;
        if (!id) {
          throw new BadParams("document id has to be set");
        }

        const { entityId, anchorText, anchorIndex } = request.body;
        if (!entityId || anchorIndex < 0) {
          throw new BadParams("entiyId and anchorIndex has to be set");
        }

        await request.db.lock();

        const existing = await Document.getDocumentById(
          request.db.connection,
          id
        );
        if (!existing) {
          throw DocumentDoesNotExist.forId(id);
        }

        existing.removeAnchor(entityId, anchorIndex);
        existing.entityIds = existing.findEntities();
        const result = await existing.update(request.db.connection, {
          content: existing.content,
          entityIds: existing.entityIds,
        });

        return {
          result: !!result.replaced,
        };
      }
    )
  );
