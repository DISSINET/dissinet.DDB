import { nonenumerable } from "@common/decorators";
import { IModel, determineOrder } from "@models/common";
import Entity from "@models/entity/entity";
import User from "@models/user/user";
import { findEntityById } from "@service/shorthands";
import treeCache from "@service/treeCache";
import { EntityEnums, UserEnums } from "@shared/enums";
import { IParentTerritory, ITerritory, ITerritoryData } from "@shared/types";
import {
  InternalServerError,
  InvalidDeleteError,
  ModelNotValidError,
  TerritoryDoesNotExits,
} from "@shared/types/errors";
import { ROOT_TERRITORY_ID } from "@shared/types/statement";
import {
  EProtocolTieType,
  ITerritoryProtocol,
  ITerritoryValidation,
} from "@shared/types/territory";
import { Connection, RDatum, WriteResult, r as rethink } from "rethinkdb-ts";

export class TerritoryProtocol implements ITerritoryProtocol, IModel {
  project: string;
  dataCollectionMethods: string[];
  description: string;
  guidelines: string[];
  detailedProtocols: string[];
  startDate: string;
  endDate: string;
  relatedDataPublications: string[];

  constructor(data: Partial<ITerritoryProtocol>) {
    this.project = data.project as string;
    this.dataCollectionMethods = data.dataCollectionMethods as string[];
    this.description = data.description as string;
    this.guidelines = data.guidelines as string[];
    this.detailedProtocols = data.detailedProtocols as string[];
    this.startDate = data.startDate as string;
    this.endDate = data.endDate as string;
    this.relatedDataPublications = data.relatedDataPublications as string[];
  }

  isValid(): boolean {
    return true;
  }
}
export class TerritoryParent implements IParentTerritory, IModel {
  territoryId: string;
  order: number;

  constructor(data: Partial<IParentTerritory>) {
    this.territoryId = data.territoryId as string;
    this.order = data.order !== undefined ? data.order : -1;
  }

  isValid(): boolean {
    if (this.territoryId === "") {
      return false;
    }

    return true;
  }
}

export class TerritoryData implements ITerritoryData, IModel {
  parent: TerritoryParent | false = false;
  protocol?: ITerritoryProtocol;
  validations?: TerritoryValidation[];

  constructor(data: Partial<ITerritoryData>) {
    if (data.parent) {
      this.parent = new TerritoryParent(data.parent || {});
    }
    if (data.protocol) {
      this.protocol = new TerritoryProtocol(data.protocol || {});
      if (data.validations) {
        this.validations = data.validations.map(
          (p) => new TerritoryValidation(p)
        );
      }
    }
  }

  isValid(): boolean {
    if (this.parent) {
      return this.parent.isValid();
    }

    if (this.validations) {
      if (this.validations.find((p) => !p.isValid())) {
        return false;
      }
    }

    return true;
  }
}

export class TerritoryValidation implements ITerritoryValidation {
  entityClasses: EntityEnums.Class[];
  entityClassifications: string[];
  entityLanguages: EntityEnums.Language[];
  entityStatuses: EntityEnums.Status[];
  tieType: EProtocolTieType; // default is property
  propType?: string[]; // relevant only in case of Property is selected as a tie
  allowedClasses?: EntityEnums.Class[]; // not relevant if allowedEntities is set
  allowedEntities?: string[]; //
  territoryId?: string | undefined;
  detail: string;
  active?: boolean;

  constructor(data: Partial<ITerritoryValidation>) {
    this.entityClasses = data.entityClasses || [];
    this.entityClassifications = data.entityClassifications || [];
    this.entityLanguages = data.entityLanguages || [];
    this.entityStatuses = data.entityStatuses || [];

    this.tieType = data.tieType || EProtocolTieType.Property;

    this.propType = data.propType;
    this.allowedClasses = data.allowedClasses;
    this.allowedEntities = data.allowedEntities;
    this.detail = data.detail || "";
    this.territoryId = data.territoryId;

    this.active = data.active;
  }

  isValid(): boolean {
    return true;
  }
}

class Territory extends Entity implements ITerritory {
  class: EntityEnums.Class.Territory;
  data: TerritoryData;

  @nonenumerable
  _siblings?: Record<number, ITerritory>;

  constructor(data: Partial<ITerritory>) {
    super(data);
    this.class = EntityEnums.Class.Territory;
    this.data = new TerritoryData(data.data || {});
  }

  isValid(): boolean {
    if (this.class !== EntityEnums.Class.Territory) {
      return false;
    }

    return super.isValid() && this.data.isValid();
  }

  setSiblings(childsMap: Record<number, ITerritory>) {
    this._siblings = childsMap;
  }

  /**
   * Use this method for doing asynchronous operation/checks before the save operation
   * @param db db connection
   */
  async beforeSave(db: Connection): Promise<void> {
    await super.beforeSave(db);

    // fix protocol if creating new T and if protocol is missing
    if (this.id || this.data.protocol || !this.data.parent) {
      return;
    }

    const parentTerritory = await findEntityById<ITerritory>(
      db,
      this.data.parent.territoryId
    );
    if (!parentTerritory) {
      throw new TerritoryDoesNotExits(
        TerritoryDoesNotExits.title,
        this.data.parent.territoryId
      );
    }

    // add territory id to every validation to be able to track it
    this.data.validations?.forEach((v: ITerritoryValidation) => {
      v.territoryId = this.id;
    });

    this.data.protocol = parentTerritory.data.protocol;
  }

  /**
   * Stores the territory in the db
   * @param db db connection
   * @returns Promise<boolean> to indicate result of the operation
   */
  async save(db: Connection | undefined): Promise<boolean> {
    if (this.data.parent) {
      // get count of future siblings and move current territory to last
      // position
      const childs = await this.findChilds.call(
        new Territory({ id: this.data.parent.territoryId }),
        db
      );

      const wantedOrder = this.data.parent.order;
      this.data.parent.order = determineOrder(wantedOrder, childs);
    } else if (
      this.id !== "T0" &&
      this.id.indexOf("root") !== 0 &&
      !this.isTemplate
    ) {
      throw new ModelNotValidError("cannot create territory without a parent");
    }

    const result = await super.save(db);
    if (result) {
      await treeCache.initialize();
    }

    return result;
  }

  async update(
    db: Connection | undefined,
    updateData: Record<string, unknown>
  ): Promise<WriteResult> {
    if (updateData["data"] && (updateData["data"] as any)["parent"]) {
      const parentData = (updateData["data"] as any)["parent"];

      let parentId: string;
      if (parentData.territoryId) {
        parentId = parentData.territoryId;
      } else if (this.data.parent) {
        parentId = this.data.parent.territoryId;
      } else {
        throw new InternalServerError("parent for territory must be set");
      }

      if (!this._siblings) {
        this._siblings = await new Territory({ id: parentId }).findChilds(db);
      }

      parentData.order = determineOrder(parentData.order, this._siblings);

      this.data.parent = new TerritoryParent({
        territoryId: parentId,
        order: parentData.order,
      });
    }

    const result = await rethink
      .table(Entity.table)
      .get(this.id)
      .update(updateData)
      .run(db);

    await treeCache.initialize();

    return result;
  }

  async delete(db: Connection): Promise<WriteResult> {
    if (!this.id) {
      throw new InvalidDeleteError(
        "delete called on territory with undefined id"
      );
    }

    const childs = await this.findChilds(db);
    if (Object.keys(childs).length) {
      throw new InvalidDeleteError("cannot delete territory with childs");
    }

    const result = await super.delete(db);

    await treeCache.initialize();

    return result;
  }

  async findChilds(
    db: Connection | undefined
  ): Promise<Record<number, ITerritory>> {
    const list: ITerritory[] = await rethink
      .table(Territory.table)
      .filter({
        class: EntityEnums.Class.Territory,
      })
      .filter((territory: RDatum) => {
        return rethink.and(
          territory("data")("parent").typeOf().eq("OBJECT"),
          territory("data")("parent")("territoryId").eq(this.id)
        );
      })
      .run(db);

    const out: Record<number, ITerritory> = {};
    for (const ter of list) {
      if (ter.data.parent) {
        out[ter.data.parent.order] = ter;
      }
    }

    return out;
  }

  canBeViewedByUser(user: User): boolean {
    // admin/owner role has always the right
    if (user.hasRole([UserEnums.Role.Owner, UserEnums.Role.Admin])) {
      return true;
    }

    // root territory - always can be viewed
    if (this.id === ROOT_TERRITORY_ID) {
      return true;
    }

    return !!treeCache.getRightForTerritory(this.id, user.rights);
  }

  canBeEditedByUser(user: User): boolean {
    // admin/owner role has always the right
    if (user.hasRole([UserEnums.Role.Owner, UserEnums.Role.Admin])) {
      return true;
    }

    // only editor should continue
    if (user.role !== UserEnums.Role.Editor) {
      return false;
    }

    const closestRight = treeCache.getRightForTerritory(this.id, user.rights);
    if (!closestRight) {
      return false;
    }

    return (
      closestRight.mode === UserEnums.RoleMode.Admin ||
      closestRight.mode === UserEnums.RoleMode.Write
    );
  }

  canBeCreatedByUser(user: User): boolean {
    // admin/owner role has always the right
    if (user.hasRole([UserEnums.Role.Owner, UserEnums.Role.Admin])) {
      return true;
    }

    // only editor should continue
    if (user.role !== UserEnums.Role.Editor) {
      return false;
    }

    // in case of create - no id provided yet
    if (!this.id) {
      return true;
    }

    if (!this.data.parent) {
      return false;
    }

    const closestRight = treeCache.getRightForTerritory(
      this.data.parent.territoryId,
      user.rights
    );

    if (!closestRight) {
      return false;
    }

    return (
      closestRight.mode === UserEnums.RoleMode.Admin ||
      closestRight.mode === UserEnums.RoleMode.Write
    );
  }

  canBeDeletedByUser(user: User): boolean {
    // admin/owner role has always the right
    if (user.hasRole([UserEnums.Role.Owner, UserEnums.Role.Admin])) {
      return true;
    }

    return false;
  }

  /**
   * Returns entity ids discovered in parent Entity.getEntitiesIds + this Territory.data.parent.id
   * @returns list of ids
   */
  getEntitiesIds(): string[] {
    const entity = new Entity({});
    const entityIds = entity.getEntitiesIds.call(this);

    if (this.data.parent) {
      entityIds.push(this.data.parent.territoryId);
    }

    if (this.data.validations) {
      this.data.validations.forEach((v) => {
        entityIds.push.apply(entityIds, v.entityClassifications || []);
        entityIds.push.apply(entityIds, v.entityLanguages || []);
        entityIds.push.apply(entityIds, v.entityStatuses || []);
        entityIds.push.apply(entityIds, v.propType || []);
        entityIds.push.apply(entityIds, v.allowedEntities || []);
      });
    }

    if (this.data.protocol) {
      Array.isArray(this.data.protocol.guidelines) &&
        this.data.protocol.guidelines.forEach((e) => entityIds.push(e));

      Array.isArray(this.data.protocol.dataCollectionMethods) &&
        this.data.protocol.dataCollectionMethods.forEach((e) =>
          entityIds.push(e)
        );

      Array.isArray(this.data.protocol.detailedProtocols) &&
        this.data.protocol.detailedProtocols.forEach((e) => entityIds.push(e));

      Array.isArray(this.data.protocol.relatedDataPublications) &&
        this.data.protocol.relatedDataPublications.forEach((e) =>
          entityIds.push(e)
        );

      entityIds.push(this.data.protocol.startDate);
      entityIds.push(this.data.protocol.endDate);
    }

    return entityIds;
  }
}

export default Territory;
