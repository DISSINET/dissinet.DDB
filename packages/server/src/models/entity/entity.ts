import { sanitizeText } from "@common/functions";
import { IDbModel, fillArray, fillFlatObject } from "@models/common";
import Prop from "@models/prop/prop";
import User from "@models/user/user";
import { findEntityById } from "@service/shorthands";
import {
  DbEnums,
  EntityEnums,
  UserEnums,
  WarningTypeEnums,
} from "@shared/enums";
import {
  IConcept,
  IEntity,
  IProp,
  IReference,
  ITerritory,
  IWarning,
} from "@shared/types";
import { entityAllowedFields } from "@shared/types/entity";
import {
  EntityDoesNotExist,
  InternalServerError,
  ModelNotValidError,
} from "@shared/types/errors";
import {
  EProtocolTieType,
  ITerritoryValidation,
} from "@shared/types/territory";
import { Connection, RDatum, WriteResult, r as rethink } from "rethinkdb-ts";
import { IRequest } from "../../custom_typings/request";
import Reference from "./reference";
import { PropSpecKind } from "@shared/types/prop";
import { IWarningPositionSection } from "@shared/types/warning";

export default class Entity implements IEntity, IDbModel {
  static table = "entities";

  id = "";
  legacyId?: string;
  class: EntityEnums.Class = EntityEnums.Class.Person;
  status: EntityEnums.Status = EntityEnums.Status.Approved;
  data: any = {};
  detail = "";
  language: EntityEnums.Language = EntityEnums.Language.Empty;
  notes: string[] = [];
  props: Prop[] = [];
  references: Reference[] = [];
  labels: string[] = [];
  isTemplate?: boolean;
  usedTemplate?: string;
  templateData?: object;

  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: Partial<IEntity>) {
    fillFlatObject(this, { ...data, data: undefined });
    fillArray<Reference>(this.references, Reference, data.references);
    fillArray<Prop>(this.props, Prop, data.props);

    this.labels = data.labels || [];
    if (data.notes !== undefined) {
      this.notes = data.notes.map(sanitizeText);
    }
    if (data.legacyId !== undefined) {
      // this.legacyId = data.legacyId;
    }
    if (data.isTemplate !== undefined) {
      this.isTemplate = data.isTemplate;
    }
    if (data.usedTemplate !== undefined) {
      this.usedTemplate = data.usedTemplate;
    }
    if (data.templateData !== undefined) {
      this.templateData = data.templateData;
    }
    if (data.createdAt !== undefined) {
      this.createdAt = data.createdAt;
    }
    if (data.updatedAt !== undefined) {
      this.updatedAt = data.updatedAt;
    }
  }

  /**
   * Stores the entity in the db
   * @param db db connection
   * @returns Promise<boolean> to indicate result of the operation
   */
  async save(db: Connection | undefined): Promise<boolean> {
    this.createdAt = new Date();

    const result = await rethink
      .table(Entity.table)
      .insert({ ...this, id: this.id || undefined })
      .run(db);

    if (result.generated_keys) {
      this.id = result.generated_keys[0];
    }

    if (result.first_error && result.first_error.indexOf("Duplicate") !== -1) {
      throw new ModelNotValidError("id already exists");
    }

    return result.inserted === 1;
  }

  /**
   * Use this method for doing asynchronous operation/checks before the save operation
   * @param db db connection
   */
  async beforeSave(db: Connection): Promise<void> {
    if (!this.isTemplate) {
      const linkedEntities = await Entity.findEntitiesByIds(
        db,
        this.getEntitiesIds()
      );
      if (linkedEntities.find((e) => e.isTemplate)) {
        throw new ModelNotValidError("cannot use template in entity instance");
      }
    }
  }

  update(
    db: Connection | undefined,
    updateData: Partial<IEntity>
  ): Promise<WriteResult> {
    // update timestamp
    this.updatedAt = updateData.updatedAt = new Date();

    // replace AND remove unwanted fields in passed object
    Object.keys(updateData).forEach(
      (key) =>
        !(key in entityAllowedFields) && delete updateData[key as keyof IEntity]
    );

    return rethink.table(Entity.table).get(this.id).update(updateData).run(db);
  }

  async getUsedByEntity(db: Connection): Promise<IEntity[]> {
    const out: Record<string, IEntity> = {};
    for (const index of DbEnums.EntityIdReferenceIndexes) {
      const entities: IEntity[] = await rethink
        .table(Entity.table)
        .getAll(this.id, { index })
        .run(db);

      for (const entity of entities) {
        out[entity.id] = entity;
      }
    }

    return Object.values(out);
  }

  async delete(db: Connection): Promise<WriteResult> {
    if (!this.id) {
      throw new InternalServerError(
        "delete called on entity with undefined id"
      );
    }

    // if bookmarks are linked to this entity, the bookmarks should be removed also
    await User.removeBookmarkedEntity(db, this.id);
    if (this.class === EntityEnums.Class.Territory) {
      await User.removeStoredTerritory(db, this.id);
    }

    const result = await rethink
      .table(Entity.table)
      .get(this.id)
      .delete()
      .run(db);

    return result;
  }

  isValid(): boolean {
    return true;
  }

  canBeViewedByUser(user: User): boolean {
    return true;
  }

  canBeCreatedByUser(user: User): boolean {
    return true;
  }

  canBeEditedByUser(user: User): boolean {
    return user.role !== UserEnums.Role.Viewer;
  }

  canBeDeletedByUser(user: User): boolean {
    return true;
  }

  /**
   * getUserRoleMode returns derived user role mode for this instance.
   * By default this method counts with default right to view - helps with
   * performance.
   * @param user
   * @returns
   */
  getUserRoleMode(user: User): UserEnums.RoleMode {
    if (user.hasRole([UserEnums.Role.Owner, UserEnums.Role.Admin])) {
      return UserEnums.RoleMode.Admin;
    }

    if (this.canBeEditedByUser(user)) {
      return UserEnums.RoleMode.Write;
    }

    return UserEnums.RoleMode.Read;
  }

  static async findUsedInProps(
    db: Connection | undefined,
    entityId: string
  ): Promise<IEntity[]> {
    const entries = await rethink
      .table(Entity.table)
      .filter((row: RDatum) => {
        return row("props").contains((entry: RDatum) =>
          rethink.or(
            entry("value")("entityId").eq(entityId),
            entry("type")("entityId").eq(entityId),
            entry("children").contains((ch1: RDatum) =>
              rethink.or(
                ch1("value")("entityId").eq(entityId),
                ch1("type")("entityId").eq(entityId),
                ch1("children").contains((ch2: RDatum) =>
                  rethink.or(
                    ch2("value")("entityId").eq(entityId),
                    ch2("type")("entityId").eq(entityId),
                    ch2("children").contains((ch3: RDatum) =>
                      rethink.or(
                        ch3("value")("entityId").eq(entityId),
                        ch3("type")("entityId").eq(entityId)
                      )
                    )
                  )
                )
              )
            )
          )
        );
      })
      .run(db);

    return entries;
  }

  /**
   * Returns entity ids that are present in data fields
   * @returns list of ids
   */
  getEntitiesIds(): string[] {
    const entityIds: Record<string, null> = {};

    Entity.extractIdsFromProps(this.props).forEach((element) => {
      if (element) {
        entityIds[element] = null;
      }
    });

    Entity.extractIdsFromReferences(this.references).forEach((element) => {
      if (element) {
        entityIds[element] = null;
      }
    });

    return Object.keys(entityIds);
  }

  getMainLabel(): string | null {
    return this.labels && this.labels.length > 0 ? this.labels[0] : null;
  }

  /**
   * Applies the template for entity.
   * @param db
   * @param tplId
   */
  async applyTemplate(req: IRequest, tplId: string): Promise<void> {
    const template = await findEntityById(req.db.connection, tplId);
    if (!template) {
      throw new EntityDoesNotExist(`Can't apply template - ${tplId} not found`);
    }

    this.usedTemplate = tplId;
    this.isTemplate = false;
    if (!this.getMainLabel() && template.labels && template.labels.length > 0) {
      this.labels = [`${template.labels[0]} (from template)`];
    }
    await this.update(req.db.connection, {
      usedTemplate: this.usedTemplate,
      isTemplate: this.isTemplate,
      labels: this.labels,
    });
  }

  static extractIdsFromReferences(references: IReference[]): string[] {
    const out: string[] = [];
    for (const reference of references) {
      out.push(reference.resource);
      out.push(reference.value);
    }

    return out;
  }

  static extractIdsFromProps(
    props: IProp[] = [],
    accepted: PropSpecKind[] = [PropSpecKind.TYPE, PropSpecKind.VALUE],
    cb?: (prop: IProp) => void
  ): string[] {
    let out: string[] = [];
    for (const prop of props) {
      if (prop.type && accepted.includes(PropSpecKind.TYPE)) {
        out.push(prop.type.entityId);
      }
      if (prop.value && accepted.includes(PropSpecKind.VALUE)) {
        out.push(prop.value.entityId);
      }

      if (cb) {
        cb(prop);
      }

      out = out.concat(Entity.extractIdsFromProps(prop.children, accepted, cb));
    }

    return out;
  }

  static async findEntitiesByIds(
    con: Connection,
    ids: string[]
  ): Promise<IEntity[]> {
    if (ids.findIndex((id) => !id) !== -1) {
      console.trace("Passed empty id to Entity.findEntitiesByIds");
    }

    const data = await rethink
      .table(Entity.table)
      .getAll(rethink.args(ids))
      .run(con);
    return data;
  }

  getTBasedWarnings(
    territoryEs: ITerritory[],
    classificationEs: IConcept[],
    propValueEs: IEntity[]
  ): IWarning[] {
    const warnings: IWarning[] = [];

    const validations: [string, ITerritoryValidation][] = [];
    territoryEs.forEach((territory) =>
      territory.data.validations
        ?.filter((v) => v.active !== false)
        .forEach((v) => validations.push([territory.id, v]))
    );

    const addNewValidationWarning = (
      warningType: WarningTypeEnums,
      teritoryId: string,
      tValidation: ITerritoryValidation
    ) => {
      warnings.push({
        type: warningType,
        origin: this.id,
        validation: tValidation,
        position: {
          section: IWarningPositionSection.Entity,
          entityId: this.id,
        },
      });
    };

    validations.forEach(([tId, validation]) => {
      const {
        entityClasses,
        entityClassifications,
        entityLanguages,
        entityStatuses,
        tieType,
        propType,
        allowedClasses,
        allowedEntities,
      } = validation;

      // check if entity falls into the allowed classes
      const entityCheck =
        !entityClasses?.length || entityClasses.includes(this.class);

      // check if entity has the allowed classifications
      const classificationCheck =
        !entityClassifications?.length ||
        entityClassifications.some((c) =>
          classificationEs.map((cla) => cla.id)?.includes(c)
        );

      const languageCheck =
        !entityLanguages?.length || entityLanguages.includes(this.language);

      const statusCheck =
        !entityStatuses?.length || entityStatuses.includes(this.status);

      if (entityCheck && classificationCheck && languageCheck && statusCheck) {
        // CLASSIFICATION TIE
        if (tieType === EProtocolTieType.Classification) {
          if (!allowedEntities || !allowedEntities.length) {
            // no condition set, so we need at least one classification
            if (!classificationEs.length) {
              addNewValidationWarning(WarningTypeEnums.TVEC, tId, validation);
            }
          } else {
            // classifications of the entity
            if (
              !allowedEntities.some((classCondition) =>
                classificationEs.map((cla) => cla.id)?.includes(classCondition)
              )
            ) {
              addNewValidationWarning(WarningTypeEnums.TVECE, tId, validation);
            }
          }
        }

        // REFERENCE TIE
        else if (tieType === EProtocolTieType.Reference) {
          const eReferences = this.references.filter(
            (r) => r.resource && r.value
          );
          // at least one reference (any) needs to be assigned to the E
          if (!allowedEntities || !allowedEntities.length) {
            if (eReferences.length === 0) {
              addNewValidationWarning(WarningTypeEnums.TVER, tId, validation);
            }
          } else {
            // at least one reference needs to be of the allowed entity
            if (
              !eReferences.some((r) => allowedEntities?.includes(r.resource))
            ) {
              addNewValidationWarning(WarningTypeEnums.TVERE, tId, validation);
            }
          }
        }

        // PROPERTY TIE
        else if (tieType === EProtocolTieType.Property) {
          const eProps = this.props.filter(
            (p) => p.value.entityId && p.type.entityId
          );

          // at least one property needs to be assigned to the E
          if (
            !propType ||
            (!propType.length &&
              !allowedEntities?.length &&
              !allowedClasses?.length)
          ) {
            if (eProps.length === 0) {
              addNewValidationWarning(WarningTypeEnums.TVEP, tId, validation);
            }

            // type is defined but value is empty
          } else if (
            propType?.length &&
            !allowedEntities?.length &&
            !allowedClasses?.length
          ) {
            if (
              eProps.length === 0 ||
              !eProps.some((p) => propType?.includes(p.type.entityId))
            ) {
              addNewValidationWarning(WarningTypeEnums.TVEPT, tId, validation);
            }
          } else if (allowedEntities?.length || allowedClasses?.length) {
            const validProps = eProps.filter((p) =>
              propType?.length ? propType.includes(p.type.entityId) : true
            );
            if (!validProps?.length) {
              addNewValidationWarning(WarningTypeEnums.TVEPV, tId, validation);
            } else if (allowedClasses?.length) {
              // class is required

              // no valid props
              if (validProps.length === 0) {
                addNewValidationWarning(
                  WarningTypeEnums.TVEPV,
                  tId,
                  validation
                );
              } else {
                let passed = true;
                for (const pi in eProps) {
                  const p = eProps[pi];
                  const propValueEntity = propValueEs.find(
                    (e) => e.id === p.value.entityId
                  );
                  if (
                    propValueEntity &&
                    propType?.includes(p.type.entityId) &&
                    !allowedClasses?.includes(propValueEntity.class)
                  ) {
                    passed = false;
                  }
                }
                if (!passed) {
                  addNewValidationWarning(
                    WarningTypeEnums.TVEPV,
                    tId,
                    validation
                  );
                }
              }
            } else if (allowedEntities?.length) {
              // entity is required
              if (validProps.length === 0) {
                addNewValidationWarning(
                  WarningTypeEnums.TVEPV,
                  tId,
                  validation
                );
              } else if (
                !validProps.some((p) =>
                  allowedEntities.includes(p.value.entityId)
                )
              ) {
                addNewValidationWarning(
                  WarningTypeEnums.TVEPV,
                  tId,
                  validation
                );
              }
            }
          }
        }
      }
    });

    return warnings;
  }

  async getEntities(db: Connection): Promise<IEntity[]> {
    return Entity.findEntitiesByIds(db, this.getEntitiesIds());
  }

  /**
   * Finds entities which uses this entity as a template
   * @param db
   * @returns
   */
  async findFromTemplate(db: Connection): Promise<IEntity[]> {
    const data = await rethink
      .table(Entity.table)
      .getAll(this.id, { index: DbEnums.Indexes.EntityUsedTemplate })
      .run(db);

    return data;
  }

  /**
   * Resets IDs of nested objects
   */
  resetIds() {
    // make sure the id will be created anew
    this.id = "";
    this.props.forEach((p) => p.resetIds());
    this.references.forEach((p) => p.resetIds());
  }
}
