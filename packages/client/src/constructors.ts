import { EntityEnums, RelationEnums, UserEnums } from "@shared/enums";
import {
  IAction,
  IBookmarkFolder,
  IConcept,
  IEntity,
  IProp,
  IReference,
  IStatement,
  IStatementActant,
  IStatementAction,
  ITerritory,
  Relation,
} from "@shared/types";
import { UserOptions } from "@shared/types/response-user";

import {
  IStatementClassification,
  IStatementIdentification,
} from "@shared/types/statement";
import api from "api";
import { deepCopy } from "utils/utils";
import { v4 as uuidv4 } from "uuid";

export const CBookmarkFolder = (bookmarkName: string): IBookmarkFolder => ({
  id: uuidv4(),
  name: bookmarkName,
  entityIds: [],
});

export const CProp = (): IProp => ({
  id: uuidv4(),
  elvl: EntityEnums.Elvl.Textual,
  certainty: EntityEnums.Certainty.Empty,
  logic: EntityEnums.Logic.Positive,
  mood: [EntityEnums.Mood.Indication],
  moodvariant: EntityEnums.MoodVariant.Realis,
  bundleOperator: EntityEnums.Operator.And,
  bundleStart: false,
  bundleEnd: false,
  children: [],

  type: {
    entityId: "",
    elvl: EntityEnums.Elvl.Textual,
    logic: EntityEnums.Logic.Positive,
    virtuality: EntityEnums.Virtuality.Reality,
    partitivity: EntityEnums.Partitivity.Unison,
  },
  value: {
    entityId: "",
    elvl: EntityEnums.Elvl.Textual,
    logic: EntityEnums.Logic.Positive,
    virtuality: EntityEnums.Virtuality.Reality,
    partitivity: EntityEnums.Partitivity.Unison,
  },
});

export const CClassification = (): IStatementClassification => ({
  id: uuidv4(),
  entityId: "",
  elvl: EntityEnums.Elvl.Textual,
  logic: EntityEnums.Logic.Positive,
  certainty: EntityEnums.Certainty.Empty,
  mood: [EntityEnums.Mood.Indication],
  moodvariant: EntityEnums.MoodVariant.Realis,
});

export const CIdentification = (): IStatementIdentification => ({
  id: uuidv4(),
  entityId: "",
  elvl: EntityEnums.Elvl.Textual,
  logic: EntityEnums.Logic.Positive,
  certainty: EntityEnums.Certainty.Empty,
  mood: [EntityEnums.Mood.Indication],
  moodvariant: EntityEnums.MoodVariant.Realis,
});

export const CMetaProp = (variables?: {
  typeEntityId?: string;
  valueEntityId?: string;
}): IProp => ({
  id: uuidv4(),
  elvl: EntityEnums.Elvl.Inferential,
  certainty: EntityEnums.Certainty.Empty,
  logic: EntityEnums.Logic.Positive,
  mood: [EntityEnums.Mood.Indication],
  moodvariant: EntityEnums.MoodVariant.Realis,
  bundleOperator: EntityEnums.Operator.And,
  bundleStart: false,
  bundleEnd: false,
  children: [],

  type: {
    entityId: variables?.typeEntityId ? variables.typeEntityId : "",
    elvl: EntityEnums.Elvl.Inferential,
    logic: EntityEnums.Logic.Positive,
    virtuality: EntityEnums.Virtuality.Reality,
    partitivity: EntityEnums.Partitivity.Unison,
  },
  value: {
    entityId: variables?.valueEntityId ? variables.valueEntityId : "",
    elvl: EntityEnums.Elvl.Inferential,
    logic: EntityEnums.Logic.Positive,
    virtuality: EntityEnums.Virtuality.Reality,
    partitivity: EntityEnums.Partitivity.Unison,
  },
});

export const InstProps: any = async (
  oldProps: IProp[],
  userRole: UserEnums.Role
) => {
  const newProps = [...oldProps];

  const validateInstProp: any = async (
    prop: IProp,
    userRole: UserEnums.Role
  ) => {
    // type
    if (prop.type.entityId) {
      const typeEntityReq = await api.entitiesGet(prop.type.entityId);

      if (typeEntityReq && typeEntityReq.data) {
        if (typeEntityReq.data.isTemplate) {
          const newTypeE = await InstTemplate(typeEntityReq.data, userRole);
          if (newTypeE) {
            prop.type.entityId = newTypeE.id;
          }
        }
      }
    }

    // value
    if (prop.value.entityId) {
      const valueEntityReq = await api.entitiesGet(prop.value.entityId);

      if (valueEntityReq && valueEntityReq.data) {
        if (valueEntityReq.data.isTemplate) {
          const newValueE = await InstTemplate(valueEntityReq.data, userRole);
          if (newValueE) {
            prop.value.entityId = newValueE.id;
          }
        }
      }
    }

    return prop;
  };

  for (const [pi1, prop1] of newProps.entries()) {
    for (const [pi2, prop2] of prop1.children.entries()) {
      for (const [pi3, prop3] of prop2.children.entries()) {
        prop2.children[pi3] = await validateInstProp(prop3, userRole);
      }
      prop1.children[pi2] = await validateInstProp(prop2, userRole);
    }

    newProps[pi1] = await validateInstProp(prop1, userRole);
  }
  return newProps;
};

export const InstActant = async (
  actant: IStatementActant,
  userRole: UserEnums.Role
) => {
  actant.props = await InstProps(actant.props, userRole);

  if (actant?.entityId) {
    const eReq = await api.entitiesGet(actant.entityId);
    const actantE = eReq.data;

    if (actantE && actantE.isTemplate) {
      const instActant = await InstTemplate(actantE, userRole);

      if (instActant) {
        actant.entityId = instActant.id;
      }
    }
  }

  return actant;
};

export const InstAction: any = async (
  action: IStatementAction,
  userRole: UserEnums.Role
) => {
  action.props = await InstProps(action.props, userRole);

  if (action?.actionId) {
    const eReq = await api.entitiesGet(action.actionId);
    const actionE = eReq.data;

    if (actionE && actionE.isTemplate) {
      const instAction = await InstTemplate(actionE, userRole);

      if (instAction) {
        action.actionId = instAction.id;
      }
    }
  }
  return action;
};

// instantiate template
// TODO #952 handle conflicts in Templates application

export const InstTemplate = async (
  templateEntity: IEntity | IStatement | ITerritory,
  userRole: UserEnums.Role,
  territoryParentId?: string
): Promise<IEntity | false> => {
  if (templateEntity.isTemplate) {
    let iEntity: false | IEntity = false;
    if (templateEntity.class === EntityEnums.Class.Statement) {
      // entity is a statement
      iEntity = DStatement(templateEntity as IStatement, userRole);
      for (const [ai, action] of iEntity.data.actions.entries()) {
        iEntity.data.actions[ai] = await InstAction(action, userRole);
      }
      for (const [ai, actant] of iEntity.data.actants.entries()) {
        iEntity.data.actants[ai] = await InstActant(actant, userRole);
      }
    } else if (
      templateEntity.class === EntityEnums.Class.Territory &&
      territoryParentId
    ) {
      iEntity = DTerritory(
        { ...(templateEntity as ITerritory) },
        territoryParentId,
        userRole
      );
    } else {
      // entity is not a statement
      iEntity = DEntity({ ...templateEntity }, userRole);
    }

    if (iEntity) {
      // #1554
      if (templateEntity.class === EntityEnums.Class.Statement) {
        iEntity.labels[0] = "";
      } else {
        iEntity.labels[0] = `[INSTANCE OF] ${templateEntity.labels[0]}`;
      }
      iEntity.usedTemplate = templateEntity.id;
      iEntity.props = await InstProps(templateEntity.props);
      iEntity.isTemplate = false;

      // references are not relevant for templates
      // for (const [ri, reference] of iEntity.references.entries()) {
      //   const iReference: IReference = await InstReference(reference, userRole);
      //   iEntity.references[ri] = iReference;
      // }
    }

    const createReq = await api.entityCreate(iEntity);
    if (createReq) {
      return iEntity;
    }
  }

  return false;
};

// apply template
export const applyTemplate = async (
  templateEntity: IEntity | IStatement,
  entity: IEntity | IStatement,
  userRole: UserEnums.Role
): Promise<IEntity> => {
  if (templateEntity.isTemplate && templateEntity.class === entity.class) {
    const newEntity = { ...templateEntity };

    if (templateEntity.class === EntityEnums.Class.Statement) {
      // entity is a statement
      for (const [ai, action] of newEntity.data.actions.entries()) {
        newEntity.data.actions[ai] = await InstAction(action, userRole);
      }
      for (const [ai, actant] of newEntity.data.actants.entries()) {
        newEntity.data.actants[ai] = await InstActant(actant, userRole);
      }

      newEntity.data.territory = entity.data.territory;
    } else if (templateEntity.class === EntityEnums.Class.Territory) {
      // entity is territory
      newEntity.data.parent = { ...entity.data.parent };
    }

    if (newEntity) {
      newEntity.id = entity.id;

      // #1554
      if (!entity.labels[0]) {
        if (templateEntity.class === EntityEnums.Class.Statement) {
          newEntity.labels[0] = "";
        } else {
          newEntity.labels[0] = `[INSTANCE OF] ${templateEntity.labels[0]}`;
        }
      }
      newEntity.usedTemplate = templateEntity.id;
      newEntity.props = await InstProps(templateEntity.props);
      newEntity.isTemplate = false;
    }

    return newEntity;
  } else {
    return entity;
  }
};

// duplicate statement
export const DStatement = (
  statement: IStatement,
  userRole: UserEnums.Role
): IStatement => {
  const duplicatedStatement: IStatement = {
    id: uuidv4(),
    class: EntityEnums.Class.Statement,
    data: { ...statement.data },
    // TODO: first label could be COPY OF labels[0] if has first label
    labels:
      statement.labels.length > 0 && statement.labels[0] !== ""
        ? [`[COPY OF] ${statement.labels[0]}`]
        : statement.labels,
    detail: statement.detail,
    language: statement.language,
    notes: statement.notes,
    props: DProps(statement.props),
    references: statement.references,
    status:
      userRole === UserEnums.Role.Admin || userRole === UserEnums.Role.Owner
        ? EntityEnums.Status.Approved
        : EntityEnums.Status.Pending,
    isTemplate: statement.isTemplate,
    usedTemplate: statement.usedTemplate,
  };

  duplicatedStatement.data.actants.forEach((a) => {
    a.id = uuidv4();
    a.props = DProps(a.props);

    a.identifications.forEach((i) => {
      i.id = uuidv4();
    });
    a.classifications.forEach((c) => {
      c.id = uuidv4();
    });
  });

  duplicatedStatement.data.actions.forEach((a) => {
    a.id = uuidv4();
    a.props = DProps(a.props);
  });

  // recreate connections to sources with new ids
  duplicatedStatement.references.forEach((r) => (r.id = uuidv4()));

  return duplicatedStatement;
};

export const DStatementActions = (
  actionsToDuplicate: IStatementAction[]
): IStatementAction[] => {
  return actionsToDuplicate.map((action) => {
    return {
      ...action,
      props: DProps(action.props),
      id: uuidv4(),
    };
  });
};

export const DStatementClassifications = (
  classifications: IStatementClassification[]
): IStatementClassification[] => {
  return classifications.map((c) => {
    return {
      ...c,
      id: uuidv4(),
    };
  });
};
export const DStatementIdentifications = (
  identifications: IStatementIdentification[]
): IStatementIdentification[] => {
  return identifications.map((i) => {
    return {
      ...i,
      id: uuidv4(),
    };
  });
};

export const DStatementActants = (
  actantsToDuplicate: IStatementActant[]
): IStatementActant[] => {
  return actantsToDuplicate.map((actant) => {
    return {
      ...actant,
      classifications: DStatementClassifications(actant.classifications),
      identifications: DStatementIdentifications(actant.identifications),
      props: DProps(actant.props),
      id: uuidv4(),
    };
  });
};

export const DReferences = (
  referenceToDuplicate: IReference[]
): IReference[] => {
  return referenceToDuplicate.map((r) => {
    return { ...r, id: uuidv4() };
  });
};

// duplicate entity
export const DEntity = (entity: IEntity, userRole: UserEnums.Role): IEntity => {
  const duplicatedEntity: IEntity = {
    id: uuidv4(),
    class: entity.class,
    data: entity.data,
    labels: [`[COPY OF] ${entity.labels[0]}`, ...entity.labels.slice(1)],
    detail: entity.detail,
    language: entity.language,
    notes: entity.notes,
    props: DProps(entity.props),
    references: DReferences(entity.references),
    status:
      userRole === UserEnums.Role.Admin || userRole === UserEnums.Role.Owner
        ? EntityEnums.Status.Approved
        : EntityEnums.Status.Pending,
    isTemplate: entity.isTemplate,
    usedTemplate: entity.usedTemplate,
  };

  return duplicatedEntity;
};

// duplicate territory
export const DTerritory = (
  entity: ITerritory,
  territoryParentId: string,
  userRole: UserEnums.Role
): ITerritory => {
  const duplicatedTerritory: ITerritory = {
    id: uuidv4(),
    class: EntityEnums.Class.Territory,
    data: {
      ...entity.data,
      parent: {
        territoryId: territoryParentId,
        order: EntityEnums.Order.Last,
      },
    },
    labels: [`[COPY OF] ${entity.labels[0]}`, ...entity.labels.slice(1)],
    detail: entity.detail,
    language: entity.language,
    notes: entity.notes,
    props: DProps(entity.props),
    references: DReferences(entity.references),
    status:
      userRole === UserEnums.Role.Admin || userRole === UserEnums.Role.Owner
        ? EntityEnums.Status.Approved
        : EntityEnums.Status.Pending,
    isTemplate: entity.isTemplate,
    usedTemplate: entity.usedTemplate,
  };

  return duplicatedTerritory;
};

export const DProps = (oldProps: IProp[]): IProp[] => {
  const newProps = deepCopy(oldProps);
  newProps.forEach((p, pi) => {
    newProps[pi].id = uuidv4();
    newProps[pi].children.forEach((pp, pii) => {
      newProps[pi].children[pii].id = uuidv4();
      newProps[pi].children[pii].children.forEach((ppp, piii) => {
        newProps[pi].children[pii].children[piii].id = uuidv4();
      });
    });
  });
  return newProps;
};

export const CStatementActant = (entityId: string): IStatementActant => ({
  id: uuidv4(),
  entityId: entityId,
  position: EntityEnums.Position.Subject,
  elvl: EntityEnums.Elvl.Textual,
  logic: EntityEnums.Logic.Positive,
  virtuality: EntityEnums.Virtuality.Reality,
  partitivity: EntityEnums.Partitivity.Unison,
  bundleOperator: EntityEnums.Operator.And,
  bundleStart: false,
  bundleEnd: false,
  props: [],
  classifications: [],
  identifications: [],
});

export const CStatementAction = (actionId: string): IStatementAction => ({
  id: uuidv4(),
  actionId: actionId,
  certainty: EntityEnums.Certainty.Empty,
  elvl: EntityEnums.Elvl.Textual,
  logic: EntityEnums.Logic.Positive,
  mood: [EntityEnums.Mood.Indication],
  moodvariant: EntityEnums.MoodVariant.Realis,
  bundleOperator: EntityEnums.Operator.And,
  bundleStart: false,
  bundleEnd: false,
  props: [],
});

export const CStatement = (
  userRole: UserEnums.Role,
  userOptions: UserOptions,
  label?: string,
  detail?: string,
  territoryId: string | undefined = undefined,
  id: string | undefined = undefined,
  lastInT: boolean = true
): IStatement => {
  const newStatement: IStatement = {
    id: id ?? uuidv4(),
    class: EntityEnums.Class.Statement,
    labels: label ? [label] : [""],
    detail: detail ? detail : "",
    language: userOptions.defaultLanguage,
    notes: [],
    data: {
      actions: [],
      text: "",
      actants: [],
      tags: [],
    },
    props: [],
    status:
      userRole === UserEnums.Role.Admin || userRole === UserEnums.Role.Owner
        ? EntityEnums.Status.Approved
        : EntityEnums.Status.Pending,
    references: [],
    isTemplate: false,
  };
  if (territoryId) {
    newStatement.data.territory = {
      territoryId: territoryId,
      order: lastInT ? EntityEnums.Order.Last : EntityEnums.Order.First,
    };
  }
  return newStatement;
};

export const CTerritory = (
  userRole: UserEnums.Role,
  userOptions: UserOptions,
  label: string,
  detail: string,
  parentId: string,
  parentOrder: number,
  id?: string
): ITerritory => ({
  id: id ?? uuidv4(),
  class: EntityEnums.Class.Territory,
  labels: [label],
  detail: detail,
  language: userOptions.defaultLanguage,
  notes: [],
  data: {
    parent: { territoryId: parentId, order: parentOrder },
  },
  status:
    userRole === UserEnums.Role.Admin || userRole === UserEnums.Role.Owner
      ? EntityEnums.Status.Approved
      : EntityEnums.Status.Pending,

  props: [],
  references: [],
  isTemplate: false,
});

export const CEntity = (
  userOptions: UserOptions,
  entityClass: EntityEnums.Class,
  label: string,
  detail?: string
): IEntity => {
  return {
    id: uuidv4(),
    class: entityClass,
    labels: [label],
    detail: detail ? detail : "",
    data: {},
    status:
      entityClass === EntityEnums.Class.Action ||
      entityClass === EntityEnums.Class.Concept
        ? EntityEnums.Status.Pending
        : EntityEnums.Status.Approved,
    language: userOptions.defaultLanguage,
    notes: [],
    props: [],
    references: [],
    isTemplate: false,
  };
};

export const CAction = (
  userOptions: UserOptions,
  label: string,
  partOfSpeech: EntityEnums.ActionPartOfSpeech,
  detail?: string
): IAction => {
  return {
    id: uuidv4(),
    class: EntityEnums.Class.Action,
    labels: [label],
    detail: detail ? detail : "",
    data: {
      pos: partOfSpeech,
      entities: {},
      valencies: { a1: "", a2: "", s: "" },
    },
    status: EntityEnums.Status.Pending,
    language: userOptions.defaultLanguage,
    notes: [],
    props: [],
    references: [],
    isTemplate: false,
  };
};

export const CConcept = (
  userOptions: UserOptions,
  label: string,
  partOfSpeech: EntityEnums.ConceptPartOfSpeech,
  detail?: string
): IConcept => {
  return {
    id: uuidv4(),
    class: EntityEnums.Class.Concept,
    labels: [label],
    detail: detail ? detail : "",
    data: { pos: partOfSpeech },
    status: EntityEnums.Status.Pending,
    language: userOptions.defaultLanguage,
    notes: [],
    props: [],
    references: [],
    isTemplate: false,
  };
};

export const CReference = (
  resourceId: string = "",
  valueId: string = ""
): IReference => ({
  id: uuidv4(),
  resource: resourceId,
  value: valueId,
});

export const CRelationIdentity = (
  entity1: string = "",
  entity2: string = ""
): Relation.IIdentification => ({
  id: uuidv4(),
  entityIds: [entity1, entity2],
  type: RelationEnums.Type.Identification,
  //logic: EntityEnums.Logic.Positive,
  certainty: EntityEnums.Certainty.Certain,
});

export const CTemplateEntity = (
  userRole: UserEnums.Role,
  entity: IEntity,
  templateLabel: string,
  templateDetail?: string
): IEntity => {
  const templateEntity =
    entity.class === EntityEnums.Class.Statement
      ? DStatement(entity as IStatement, userRole)
      : DEntity(entity as IEntity, userRole);

  if (entity.class === EntityEnums.Class.Statement) {
    delete templateEntity.data["territory"];
  }
  if (entity.class === EntityEnums.Class.Territory) {
    templateEntity.data["parent"] = false;
  }

  templateEntity.isTemplate = true;
  templateEntity.usedTemplate = "";
  templateEntity.labels = [templateLabel];

  if (templateDetail) {
    templateEntity.detail = templateDetail;
  }

  return templateEntity;
};
