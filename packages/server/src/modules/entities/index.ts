import { mergeDeep } from "@common/functions";
import { ResponseEntity, ResponseEntityDetail } from "@models/entity/response";
import Audit from "@models/audit/audit";
import { getEntityClass, getRelationClass } from "@models/factory";
import { findEntityById } from "@service/shorthands";
import {
  IEntity,
  IResponseEntity,
  IResponseDetail,
  IResponseGeneric,
  RequestSearch,
  EntityTooltip,
} from "@shared/types";
import {
  EntityDoesNotExist,
  BadParams,
  InternalServerError,
  ModelNotValidError,
  PermissionDeniedError,
  AuditDoesNotExist,
  InvalidDeleteError,
  CustomError,
} from "@shared/types/errors";
import { Router } from "express";
import { asyncRouteHandler } from "../index";
import { ResponseSearch } from "@models/entity/response-search";
import { IRequestSearch } from "@shared/types/request-search";
import { getAuditByEntityId } from "@modules/audits";
import { ResponseTooltip } from "@models/entity/response-tooltip";
import { IRequest } from "src/custom_typings/request";
import Relation from "@models/relation/relation";
import { RelationEnums } from "@shared/enums";
import { Relation as RelationType } from "@shared/types";
import Document from "@models/document/document";
import { copyRelations } from "@models/relation/functions";
import Entity from "@models/entity/entity";
import { EventType } from "@shared/types/stats";

export default Router()
  /**
   * @openapi
   * /entities/{entityId}:
   *   get:
   *     description: Returns entity entry
   *     tags:
   *       - entities
   *     parameters:
   *       - in: path
   *         name: entityId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the entity entry
   *     responses:
   *       200:
   *         description: Returns IResponseEntity object for entity entry
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseEntity"
   */
  .get(
    "/:entityId",
    asyncRouteHandler<IResponseEntity>(
      async (request: IRequest<{ entityId: string }>) => {
        const entityId = request.params.entityId;

        if (!entityId) {
          throw new BadParams("entityId has to be set");
        }

        const entityData = await findEntityById<IEntity>(
          request.db,
          entityId as string
        );

        if (!entityData) {
          throw new EntityDoesNotExist(
            `entity ${entityId} was not found`,
            entityId
          );
        }
        const entity = getEntityClass({ ...entityData });

        const response = new ResponseEntity(entity);

        await response.prepare(request);

        return response;
      }
    )
  )
  /**
   * @openapi
   * /entities/{entityId}/audits:
   *   get:
   *     description: Returns audit data for entity
   *     tags:
   *       - entities
   *     parameters:
   *       - in: path
   *         name: entityId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the entity entry
   *     responses:
   *       200:
   *         description: Returns ResponseAudit object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseAudit"
   */
  .get("/:entityId/audits", getAuditByEntityId)
  /**
   * @openapi
   * /entities/:
   *   get:
   *     description: Returns list of filtered entity entries
   *     tags:
   *       - entities
   *     parameters:
   *       - in: query
   *         name: search params
   *         schema:
   *           $ref: "#/components/schemas/IRequestSearch"
   *         required: true
   *         description: search options for the query
   *         style: form
   *         explode: true
   *     responses:
   *       200:
   *         description: Returns list of entity entries
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: "#/components/schemas/IResponseEntity"
   */
  .get(
    "/",
    asyncRouteHandler<IResponseEntity[]>(
      async (req: IRequest<unknown, unknown, IRequestSearch>) => {
        const search = new RequestSearch(req.query);
        if (
          (search.label && search.label.length < 2) ||
          (search.labelOrId && search.labelOrId.length < 2)
        ) {
          return [];
        }

        const err = search.validate();
        if (err) {
          throw err;
        }

        const response = new ResponseSearch(search);
        return await response.prepare(req);
      }
    )
  )
  /**
   * @openapi
   * /entities/:
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
      const model = getEntityClass(request.body as Record<string, unknown>);

      if (!model.isValid()) {
        throw new ModelNotValidError("");
      }

      if (!model.canBeCreatedByUser(request.getUserOrFail())) {
        throw new PermissionDeniedError("entity cannot be created");
      }

      await request.db.lock();

      await model.beforeSave(request.db.connection);

      const saved = await model.save(request.db.connection);
      if (!saved) {
        throw new InternalServerError("cannot create entity");
      }

      const out: IResponseGeneric = { result: true, data: model };

      if (model.usedTemplate) {
        await model.applyTemplate(request, model.usedTemplate);
        try {
          await copyRelations(request, model.usedTemplate, model.id, [
            RelationEnums.Type.Classification,
            RelationEnums.Type.Related,
          ]);
        } catch (e) {
          out.message = "At least one relation not applied";
        }
      }

      await Audit.createNew(request, model.id, request.body, EventType.CREATE);

      return out;
    })
  )
  /**
   * @openapi
   * /entities/:entityId/clone:
   *   post:
   *     description: Create a new cloned entity from another
   *     tags:
   *       - entities
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .post(
    "/:entityId/clone",
    asyncRouteHandler<IResponseGeneric<IEntity>>(
      async (request: IRequest<{ entityId: string }>) => {
        const originalId = request.params.entityId as string;
        const original = await findEntityById(request.db, originalId);
        if (!original) {
          throw new EntityDoesNotExist(
            "cannot copy entity - does not exist",
            originalId
          );
        }

        // clone the entry without id and with recreated ids - should be created anew
        const clone = getEntityClass({
          ...original,
          id: "",
          legacyId: undefined,
        } as Partial<IEntity>);
        if (!clone.isValid()) {
          throw new ModelNotValidError("");
        }

        if (!clone.canBeCreatedByUser(request.getUserOrFail())) {
          throw new PermissionDeniedError("entity cannot be copied");
        }

        clone.resetIds();

        await request.db.lock();

        const saved = await clone.save(request.db.connection);
        if (!saved) {
          throw new InternalServerError("cannot copy entity");
        }

        await Audit.createNew(request, clone.id, clone, EventType.CREATE);

        const rels = (
          await Relation.findForEntities(request.db.connection, [originalId])
        ).filter((rel) => {
          const relType = RelationType.RelationRules[rel.type];
          if (!relType?.asymmetrical) {
            return true;
          } else {
            return rel.entityIds.indexOf(originalId) === 0;
          }
        });

        const relsWithClas = rels.map((r) => getRelationClass(r));
        const relsCopied = await Relation.copyMany(
          request,
          relsWithClas,
          originalId,
          clone.id
        );

        return {
          result: true,
          message:
            relsCopied !== relsWithClas.length
              ? "There has been at least one conflict while copying relations"
              : undefined,
          data: clone,
        };
      }
    )
  )
  .post(
    "/:entityId/restore",
    asyncRouteHandler<IResponseGeneric<object>>(
      async (request: IRequest<{ entityId?: string }, {}, {}>) => {
        const entityId = request.params.entityId || "";
        const audit = await Audit.getLastForEntity(
          request.db.connection,
          entityId
        );
        if (!audit) {
          throw new AuditDoesNotExist(
            "cannot restore entity - audit does not exist",
            entityId
          );
        }

        const restoration = getEntityClass({
          ...audit.changes,
        } as Partial<IEntity>);
        if (!restoration.isValid()) {
          throw new ModelNotValidError("");
        }

        if (!restoration.canBeCreatedByUser(request.getUserOrFail())) {
          throw new PermissionDeniedError("entity cannot be restored");
        }

        await request.db.lock();

        const saved = await restoration.save(request.db.connection);
        if (!saved) {
          throw new InternalServerError("cannot restore entity");
        }

        return {
          result: true,
          message: "Entity restored",
          data: audit.changes,
        };
      }
    )
  )
  /**
   * @openapi
   * /entities/{entityId}:
   *   put:
   *     description: Update an existing entity entry
   *     tags:
   *       - entities
   *     parameters:
   *       - in: path
   *         name: entityId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the entity entry
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
  .put(
    "/:entityId",
    asyncRouteHandler<IResponseGeneric>(
      async (request: IRequest<{ entityId: string }>) => {
        const entityId = request.params.entityId;
        const entityData = request.body as Record<string, unknown>;

        // not validation, just required data for this operation
        if (!entityId || !entityData || Object.keys(entityData).length === 0) {
          throw new BadParams("entity id and data have to be set");
        }

        await request.db.lock();

        // entityId must be already in the db
        const existingEntity = await findEntityById(request.db, entityId);
        if (!existingEntity) {
          throw new EntityDoesNotExist(
            `entity with id ${entityId} does not exist`,
            entityId
          );
        }

        // get correct IDbModel implementation
        const model = getEntityClass({
          ...mergeDeep(existingEntity, entityData),
          class: existingEntity.class,
          id: entityId,
        });

        // checking the validity of the final model (already has updated data)
        if (!model.isValid()) {
          throw new ModelNotValidError("");
        }

        if (!model.canBeEditedByUser(request.getUserOrFail())) {
          throw new PermissionDeniedError("entity cannot be saved");
        }

        await model.beforeSave(request.db.connection);

        // update only the required fields
        const result = await model.update(request.db.connection, entityData);

        if (result.replaced || result.unchanged) {
          await Audit.createNew(request, entityId, entityData, EventType.EDIT);

          return {
            result: true,
          };
        } else {
          throw new InternalServerError(`cannot update entity ${entityId}`);
        }
      }
    )
  )
  /**
   * @openapi
   * /entities/{entityId}:
   *   delete:
   *     description: Delete an entity entry
   *     tags:
   *       - entities
   *     parameters:
   *       - in: path
   *         name: entityId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the entity entry
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .delete(
    "/:entityId?",
    asyncRouteHandler<IResponseGeneric<Record<string, CustomError | true>>>(
      async (
        req: IRequest<{ entityId?: string }, { entityIds?: string[] }>
      ) => {
        let ids: string[] | undefined;
        if (req.params.entityId) {
          ids = [req.params.entityId];
        } else if (req.body.entityIds) {
          ids = req.body.entityIds;
        }

        if (!ids || ids.length === 0) {
          throw new BadParams("at least one entity id needs to be provided");
        }

        await req.db.lock();

        const out: IResponseGeneric<Record<string, CustomError | true>> = {
          result: true,
        };

        out.data = {};

        // entity should exist
        const existing = await Entity.findEntitiesByIds(req.db.connection, ids);
        for (const wantedId of ids) {
          if (!existing.find((e) => e.id === wantedId)) {
            out.result = false;
            out.data[wantedId] = new EntityDoesNotExist(
              `entity with id ${wantedId} does not exist`,
              wantedId
            );
          }
        }

        // key is id of entity, that depends on entities, that will be deleted (value array)
        let dependencyMap: Record<string, string[]> = {};
        // function will remove removedId as dependency from possible waiting entries
        const removeDependency = (removedId: string) => {
          for (const entityId of Object.keys(dependencyMap)) {
            const index = dependencyMap[entityId].indexOf(removedId);
            if (index !== -1) {
              dependencyMap[entityId].splice(index, 1);
            }
          }
          delete dependencyMap[removedId];
        };

        // check for any blocking reasons for not deleting the entity + construct dependency map
        for (const entity of existing) {
          // if relations are linked to this entity, the delete should not be allowed
          const [linkIds, relIds] = await Relation.getLinkedForEntities(req, [
            entity.id,
          ]);
          if (relIds.length) {
            out.result = false;
            out.data[entity.id] = new InvalidDeleteError(
              `Cannot be deleted while linked to relations (${
                relIds[0] +
                (relIds.length > 1
                  ? " + " + (relIds.length - 1) + " others"
                  : "")
              })`
            ).withData(linkIds);
            continue;
          }

          const docs = await Document.findByEntityId(
            req.db.connection,
            entity.id
          );
          if (docs.length) {
            out.result = false;
            out.data[entity.id] = new InvalidDeleteError(
              `Cannot be deleted while anchored to documents (${
                docs[0].id +
                (docs.length > 1 ? " + " + (docs.length - 1) + " others" : "")
              })`
            ).withData(docs.map((d) => d.id));
            continue;
          }

          const model = getEntityClass(entity);
          if (!model.canBeDeletedByUser(req.getUserOrFail())) {
            out.result = false;
            out.data[entity.id] = new PermissionDeniedError(
              "entity cannot be deleted by current user"
            );
            continue;
          }

          dependencyMap[entity.id] = [];

          // find other entities dependend on this one
          const usedBy = await model.getUsedByEntity(req.db.connection);
          if (usedBy.length) {
            out.result = false;
            out.data[entity.id] = new InvalidDeleteError(
              `Referenced by other entities`
            ).withData(usedBy.map((e) => e.id));
            dependencyMap[entity.id] = usedBy.map((e) => e.id);
            continue;
          }
        }

        let removedCount: number;
        do {
          removedCount = 0;
          for (const entityId of Object.keys(dependencyMap)) {
            if (dependencyMap[entityId].length === 0) {
              try {
                const model = getEntityClass(
                  existing.find((e) => e.id === entityId)
                );
                if ((await model.delete(req.db.connection)).deleted !== 1) {
                  throw new InternalServerError(
                    `cannot delete entity ${entityId}`
                  );
                }
                out.data[entityId] = true;
                removeDependency(entityId);
                removedCount++;
              } catch (e) {
                out.result = false;
                out.data[entityId] = e as CustomError;
              }
            }
          }
        } while (removedCount > 0);

        out.result = Object.keys(out.data).reduce<boolean>(
          (acc, c) => acc && !!out.data && out.data[c] === true,
          true
        );

        // throw basic error if deleting single entity
        if (ids.length === 1 && !out.result) {
          throw out.data[Object.keys(out.data)[0]];
        }

        return out;
      }
    )
  )
  /**
   * @openapi
   * /entities/{entityId}/detail:
   *   get:
   *     description: Returns detail for entity entry
   *     tags:
   *       - entities
   *     parameters:
   *       - in: path
   *         name: entityId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the entity entry
   *     responses:
   *       200:
   *         description: Returns IResponseDetail object for entity entry
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: "#/components/schemas/IResponseDetail"
   */
  .get(
    "/:entityId/detail",
    asyncRouteHandler<IResponseDetail>(async (request: IRequest) => {
      const entityId = request.params.entityId;

      if (!entityId) {
        throw new BadParams("entity id has to be set");
      }

      const entityData = await findEntityById(request.db, entityId);
      if (!entityData) {
        throw new EntityDoesNotExist(
          `entity ${entityId} was not found`,
          entityId
        );
      }

      const entity = getEntityClass({ ...entityData });

      if (!entity.canBeViewedByUser(request.getUserOrFail())) {
        throw new PermissionDeniedError(`cannot view entity ${entityId}`);
      }

      const response = new ResponseEntityDetail(entity);

      await response.prepare(request);

      return response;
    })
  )
  /**
   * @openapi
   * /entities/{entityId}/tooltip:
   *   get:
   *     description: Returns tooltip detail for entity entry
   *     tags:
   *       - entities
   *     parameters:
   *       - in: path
   *         name: entityId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the entity entry
   *     responses:
   *       200:
   *         description: Returns EntityTooltipIResponse object for entity entry
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/EntityTooltipIResponse"
   */
  .get(
    "/:entityId/tooltip",
    asyncRouteHandler<EntityTooltip.IResponse>(async (request: IRequest) => {
      const entityId = request.params.entityId;

      if (!entityId) {
        throw new BadParams("entity id has to be set");
      }

      const entityData = await findEntityById(request.db, entityId);
      if (!entityData) {
        throw new EntityDoesNotExist(
          `entity ${entityId} was not found`,
          entityId
        );
      }

      const entity = getEntityClass({ ...entityData });

      if (!entity.canBeViewedByUser(request.getUserOrFail())) {
        throw new PermissionDeniedError(`cannot view entity ${entityId}`);
      }

      const response = new ResponseTooltip(entity);

      await response.prepare(request);

      return response;
    })
  );
