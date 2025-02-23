import { EntityEnums, UserEnums } from "@shared/enums";
import {
  IAction,
  IConcept,
  IEntity,
  IResponseStatement,
  IStatement,
  ITerritory,
} from "@shared/types";
import {
  IWarning,
  IWarningPosition,
  IWarningPositionSection,
} from "@shared/types/warning";

import { ActionEntity } from "@models/action/action";
import Classification from "@models/relation/classification";
import { findEntityById, getEntitiesByIds } from "@service/shorthands";
import treeCache from "@service/treeCache";
import { WarningTypeEnums } from "@shared/enums";
import { InternalServerError } from "@shared/types/errors";
import { ITerritoryValidation } from "@shared/types/territory";
import { Connection } from "rethinkdb-ts";
import { IRequest } from "src/custom_typings/request";
import Entity from "../entity/entity";
import { PositionRules } from "./PositionRules";
import Statement from "./statement";
import { PropSpecKind } from "@shared/types/prop";

export class ResponseStatement extends Statement implements IResponseStatement {
  entities: { [key: string]: IEntity };
  right: UserEnums.RoleMode = UserEnums.RoleMode.Read;
  warnings: IWarning[];

  constructor(entity: IStatement) {
    super(entity);
    this.entities = {};
    this.warnings = [];
  }

  async prepare(req: IRequest) {
    this.right = this.getUserRoleMode(req.getUserOrFail());
    await this.prepareEntities(req.db.connection);
    if (!this.usedTemplate) {
      this.warnings = await this.getWarnings(req);
    }
  }

  /**
   * Prepares the entities map
   * @param db
   */
  async prepareEntities(db: Connection): Promise<void> {
    const entities = await this.getEntities(db);
    this.entities = Object.assign({}, ...entities.map((x) => ({ [x.id]: x })));
  }

  /**
   * Returns list of supported entity classes from actions valencies
   * @returns list of classes
   */
  getSubjectETypes(): EntityEnums.ExtendedClass[] {
    return this.data.actions
      .map((a) => a.actionId)
      .filter(
        (aid) =>
          this.entities[aid] &&
          this.entities[aid].class === EntityEnums.Class.Action
      )
      .reduce<EntityEnums.ExtendedClass[]>(
        (acc, aid) =>
          acc.concat((this.entities[aid] as IAction).data.entities.s || []),
        []
      );
  }

  /**
   * Shorthand for creating new statement warning
   * @param warningType
   * @param position
   * @returns new instance of warning
   */
  newStatementWarning(
    warningType: WarningTypeEnums,
    position: IWarningPosition,
    validation?: ITerritoryValidation
  ): IWarning {
    return {
      type: warningType,
      origin: this.id,
      validation,
      position,
    };
  }

  /**
   * Returns single cached entity by id. Throws error in case of not found entity.
   * @param id
   * @returns wanted IEntity
   */
  getEntity(id: string): IEntity {
    const entity = this.entities[id];

    if (!entity) {
      throw new InternalServerError(`Entity ${id} not preloaded`);
    }

    return entity;
  }

  async obtainEntity(entityId: string, req: IRequest): Promise<IEntity> {
    const storedEntity = this.entities[entityId];

    if (storedEntity) {
      return storedEntity;
    }

    const entity = await findEntityById(req.db, entityId);

    this.entities[entityId] = entity;
    return entity;
  }

  /**
   * Check allowed entity classes for subject / actant1 / actant2 position based on action valencies and adds it to warnings field
   * @param warnings
   * @param position
   * @param warningType
   */
  checkValencyClassesForPosition(
    position: EntityEnums.Position,
    warningType: WarningTypeEnums
  ): IWarning[] {
    const warnings: IWarning[] = [];

    let allowedClasses: EntityEnums.ExtendedClass[] = [];

    this.data.actions
      .filter((a) => !!a.actionId)
      .map((a) => a.actionId)
      .forEach((aid) => {
        const actionEntities = (this.getEntity(aid) as IAction).data
          .entities as Record<EntityEnums.Position, EntityEnums.Class[]>;
        allowedClasses = allowedClasses.concat(actionEntities[position]);
      });

    this.data.actants
      .filter((a) => a.position === position)
      .filter((a) => !!a.entityId)
      .forEach((a) => {
        const entity = this.entities[a.entityId];
        if (entity && !allowedClasses.includes(entity.class)) {
          warnings.push(
            this.newStatementWarning(warningType, {
              section: IWarningPositionSection.Statement,
              subSection: `${position}`,
              entityId: a.entityId,
              actantId: a.id,
            })
          );
        }
      });

    return warnings;
  }

  /**
   * check all avalidation warnings for single entity
   */
  async getTValidationWarnings(req: IRequest): Promise<IWarning[]> {
    let warnings: IWarning[] = [];

    let allEntities = [
      ...this.data.actants.map((a) => a.entityId),
      ...this.data.actions.map((a) => a.actionId),
      this.id, // statement itself
    ];

    this.data.actants.forEach((a) => {
      allEntities.push(...a.classifications.map((c) => c.entityId));
      allEntities.push(...a.identifications.map((c) => c.entityId));

      // todo go deeper
      allEntities.push(...a.props.map((c) => c.type.entityId));
      allEntities.push(...a.props.map((c) => c.value.entityId));
    });
    this.data.actions.forEach((a) => {
      allEntities.push(...a.props.map((c) => c.type.entityId));
      allEntities.push(...a.props.map((c) => c.value.entityId));
    });

    allEntities = [...new Set(allEntities)];

    const parentTId = this.data.territory?.territoryId as string;
    const lineageTIds = [parentTId, ...treeCache.tree.idMap[parentTId].path];
    const territoryEs = await getEntitiesByIds<ITerritory>(
      req.db.connection,
      lineageTIds
    );

    // prepare entities
    for (const ei in allEntities) {
      const entityId = allEntities[ei];
      if (entityId) {
        const entityData = await this.obtainEntity(entityId, req);
        const entity = new Entity(entityData);

        const classificationRels =
          await Classification.getClassificationForwardConnections(
            req.db.connection,
            entityId,
            entity.class,
            1,
            0
          );
        const classificationEs: IConcept[] = await getEntitiesByIds<IConcept>(
          req.db.connection,
          classificationRels.map((c) => c.entityIds[1])
        );
        const propValueEs = await getEntitiesByIds<IEntity>(
          req.db.connection,
          Entity.extractIdsFromProps(entity.props, [PropSpecKind.VALUE])
        );
        const eWarnings = entity.getTBasedWarnings(
          territoryEs,
          classificationEs,
          propValueEs
        );
        if (eWarnings.length) {
          warnings = warnings.concat(eWarnings);
        }
      }
    }

    return warnings;
  }

  /**
   * checks actions -> actants relations for single position and generates appropriate IWarning entries
   * @param position
   * @returns list of warnings
   */
  getWarningsForPosition(position: EntityEnums.Position): IWarning[] {
    const warnings: IWarning[] = [];

    // actantId / entityId could be empty, ignore them
    const actions = this.data.actions.filter((a) => !!a.actionId);
    const actants = this.data.actants
      .filter((a) => !!a.entityId)
      .filter((a) => a.position === position);

    const rules = new PositionRules(
      actions.map<IAction>((a) => this.getEntity(a.actionId) as IAction),
      position
    );

    if (rules.mismatch) {
      warnings.push(
        this.newStatementWarning(WarningTypeEnums.WAC, {
          section: IWarningPositionSection.Statement,
          subSection: `${position}`,
        })
      );
    }

    if (!rules.mismatch && !actants.length) {
      if (!rules.allowsEmpty() && !rules.allUndefined) {
        warnings.push(
          this.newStatementWarning(WarningTypeEnums.MA, {
            section: IWarningPositionSection.Statement,
            subSection: `${position}`,
          })
        );
      } else if (rules.allUndefined) {
        return warnings;
      }
    }

    rules.undefinedActions.forEach((actionId) => {
      warnings.push(
        this.newStatementWarning(WarningTypeEnums.AVU, {
          section: IWarningPositionSection.Statement,
          subSection: position,
          entityId: actionId,
        })
      );
    });

    if (rules.allUndefined || rules.mismatch) {
      return warnings;
    }

    for (const stAction of actions) {
      const action = this.getEntity(stAction.actionId);
      const actionRules = ActionEntity.toRules(action.data.entities)[position];

      // continue with actant specific warning only if common warn is not set
      for (const stActant of actants) {
        const actant = this.getEntity(stActant.entityId);
        const position = stActant.position;

        if (!actionRules) {
          // action rules undefined for this position - only common warning should be returned (AVU)
        } else if (PositionRules.allowsOnlyEmpty(actionRules)) {
          warnings.push(
            this.newStatementWarning(WarningTypeEnums.ANA, {
              section: IWarningPositionSection.Statement,
              subSection: `${position}`,
              actantId: stActant.id,
              entityId: action.id,
            })
          );
        } else if (!actionRules.includes(actant.class)) {
          warnings.push(
            this.newStatementWarning(WarningTypeEnums.WA, {
              section: IWarningPositionSection.Statement,
              subSection: `${position}`,
              actantId: stActant.id,
              entityId: action.id,
            })
          );
        }
      }
    }

    return warnings;
  }

  /**
   * get a list of all warnings for actions -> actants relations
   * @returns list of warnings
   */
  async getWarnings(req: IRequest): Promise<IWarning[]> {
    let warnings: IWarning[] = [];

    const tbasedWarnings = await this.getTValidationWarnings(req);
    warnings = warnings.concat(tbasedWarnings);

    if (!this.data.actions.length) {
      warnings.push(this.newStatementWarning(WarningTypeEnums.NA, {}));
      return warnings;
    }

    for (const position of [
      EntityEnums.Position.Actant1,
      EntityEnums.Position.Actant2,
      EntityEnums.Position.Subject,
    ]) {
      warnings = warnings.concat(this.getWarningsForPosition(position));
    }

    return warnings;
  }
}
