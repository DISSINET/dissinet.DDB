import { EntityEnums } from "@shared/enums";
import {
  IEntity,
  IResponseGeneric,
  IResponseTree,
  IStatementActant,
  IStatementAction,
  Relation,
} from "@shared/types";
import { ThemeColor } from "Theme/theme";
import { AxiosResponse } from "axios";

interface IEntityColor {
  entityClass: EntityEnums.ExtendedClass;
  color: keyof ThemeColor;
  label: string;
}

// Use for colors, for dropdowns use entity.ts dictionary
export const EntityColors: { [key: string]: IEntityColor } = {
  T: {
    entityClass: EntityEnums.Class.Territory,
    color: "entityT",
    label: "Territory",
  },
  R: {
    entityClass: EntityEnums.Class.Resource,
    color: "entityR",
    label: "Resource",
  },
  A: {
    entityClass: EntityEnums.Class.Action,
    color: "entityA",
    label: "Action",
  },
  S: {
    entityClass: EntityEnums.Class.Statement,
    color: "entityS",
    label: "Statement",
  },
  C: {
    entityClass: EntityEnums.Class.Concept,
    color: "entityC",
    label: "Concept",
  },
  E: {
    entityClass: EntityEnums.Class.Event,
    color: "entityE",
    label: "Event",
  },
  G: {
    entityClass: EntityEnums.Class.Group,
    color: "entityG",
    label: "Group",
  },
  L: {
    entityClass: EntityEnums.Class.Location,
    color: "entityL",
    label: "Location",
  },
  O: {
    entityClass: EntityEnums.Class.Object,
    color: "entityO",
    label: "Object",
  },
  P: {
    entityClass: EntityEnums.Class.Person,
    color: "entityP",
    label: "Person",
  },
  B: {
    entityClass: EntityEnums.Class.Being,
    color: "entityB",
    label: "Living Being",
  },
  V: {
    entityClass: EntityEnums.Class.Value,
    color: "entityV",
    label: "Value",
  },
  X: {
    entityClass: EntityEnums.Extension.NoClass,
    color: "white",
    label: "No class",
  },
  empty: {
    entityClass: EntityEnums.Extension.Empty,
    color: "white",
    label: "Empty",
  },
  all: {
    entityClass: EntityEnums.Extension.Any,
    color: "white",
    label: "Any",
  },
};

export const ExtentedEntityColors: { [key: string]: IEntityColor } = {
  X: {
    entityClass: EntityEnums.Extension.NoClass,
    color: "white",
    label: "No class",
  },
  empty: {
    entityClass: EntityEnums.Extension.Empty,
    color: "white",
    label: "Empty",
  },
  all: {
    entityClass: EntityEnums.Extension.Any,
    color: "white",
    label: "Any",
  },
};

export type EntityKeys = keyof typeof EntityColors;

export interface IPage {
  id: "main" | "users" | "acl" | "about" | "documents";
  label: string;
  color: "info" | "success" | "danger" | "warning";
  href: string;
  admin?: boolean;
  icon?: React.ReactElement;
}

export interface Node {
  id: string;
  label: string;
  children: Array<Node>;
}
export enum ItemTypes {
  TAG = "TAG",
  STATEMENT_ROW = "STATEMENT_ROW",
  STATEMENT_ORDER_ROW = "STATEMENT_ORDER_ROW",
  ACTANT_ROW = "ACTANT_ROW",
  ENTITY_ROW = "ENTITY_ROW",
  ACTION_ROW = "ACTION_ROW",
  PROP_ROW = "PROP_ROW",
  PROP_ROW1 = "PROP_ROW1",
  PROP_ROW2 = "PROP_ROW2",
  PROP_ROW3 = "PROP_ROW3",
  REFERENCE_ROW = "REFERENCE_ROW",
  MULTI_RELATION = "MULTI_RELATION",
  DETAIL_TAB = "DETAIL_TAB",
}

export type DragItem = {
  index: number;
  id: string;
};
export interface EntityDragItem extends DragItem {
  entity: IEntity | false;
  entityClass: EntityEnums.Class;
  isTemplate: boolean;
  isDiscouraged: boolean;
}
export interface DraggedEntityReduxItem {
  index?: number;
  id?: string;
  parentId?: string;
  lvl?: number;
}
export enum DraggedPropRowCategory {
  ACTANT = "ACTANT",
  ACTION = "ACTION",
  META_PROP = "META_PROP",
}
export interface DraggedPropRowItem {
  index?: number;
  id?: string;
  parentId?: string;
  lvl?: number;
  category?: DraggedPropRowCategory;
}
export interface DraggedActantRowItem {
  category?: DraggedPropRowCategory;
}

export type ISearchPositionInStatement =
  | "any"
  | "action"
  | "actant"
  | "tag"
  | "reference"
  | "prop value"
  | "prop type";

export interface IRequestSearchEntity {
  class?: string; //izy
  label?: string; // regex, should also work from the middle...
  detail?: string; // also regex
  notes?: string; // is the text used within any note
  status?: EntityEnums.Status; // izy
  language?: EntityEnums.Language; //izy
  logicalType?: EntityEnums.LogicalType;
  hasProps?: IEntityHasProps[]; //this should be checked within metaprops and within all statements where the entity is used as the prop origin
  usedInTerritories?: IEntityUsedInTerritory[]; // this is probably little bit complicated
  usedInStatements?: IEntityUsedInStatementWith[]; // and this is supposed to be complicated as well
}

interface IEntityHasProps {
  value?: string; // 'any' as default, otherwise this is the id of the actant that was used as the value within prop
  type?: string; // 'any' as default, id of the actat used as the type of the prop
  negative?: boolean; // false on default
  bundleOperator?: "and" | "or"; // and on default and may be implemented in 1.4.0
  bundleStart?: boolean; // false on default and may be implemented in 1.4.0
  bundleEnd?: boolean; // false on default and may be implemented in 1.4.0
}
interface IEntityUsedInTerritory {
  territoryId?: string;
  position?: ISearchPositionInStatement; // any as default, may be implemented in 1.4.0
  negative?: boolean; // false on default
  bundleOperator?: "and" | "or"; // and on default and may be implemented in 1.4.0
  bundleStart?: boolean; // false on default and may be implemented in 1.4.0
  bundleEnd?: boolean; // false on default and may be implemented in 1.4.0
}

interface IEntityUsedInStatementWith {
  entityPosition?: ISearchPositionInStatement; // position of the original entity within the statement
  withEntity?: string; // entity that is used within the same statement
  withEntityPosition?: ISearchPositionInStatement; // what is this "with" entity position? default any
  negative?: boolean; // false as default, should be within 1.3.0
  bundleOperator?: "and" | "or"; // and on default and may be implemented in 1.4.0
  bundleStart?: boolean; // false on default and may be implemented in 1.4.0
  bundleEnd?: boolean; // false on default and may be implemented in 1.4.0
}

export interface IRequestSearchStatement {
  text?: string; // izy
  author?: string; // is author of the statement the user with this id ?
  editor?: string; // is user id in any audit?
  note?: string; // is the text used within any note
  territory?: string; // check the whole tree to the root
  usedEntities?: IUsedEntityStatement[]; // see below
}

interface IUsedEntityStatement {
  entityId?: string;
  position?: ISearchPositionInStatement;
  negative?: boolean; // positive as default, should be within 1.3.0
  operator?: "and" | "or"; // and on default and may be implemented in 1.4.0
  bundleStart?: boolean; // false on default and may be implemented in 1.4.0
  bundleEnd?: boolean; // false on default and may be implemented in 1.4.0
}

export type DropdownItem = { value: string; label: string; info?: string };

export interface EntitySingleDropdownItem extends DropdownItem {
  value: EntityEnums.Class;
}

export interface EntityMultiDropdownItem extends DropdownItem {
  value:
    | EntityEnums.Class
    | EntityEnums.Extension.Any
    | EntityEnums.Extension.Empty;
}

export type SearchParams = {
  territory?: string;
  statement?: string;
  actant?: string;
};

// Attribute Editor
export type PropAttributeName =
  | "certainty"
  | "elvl"
  | "logic"
  | "mood"
  | "moodvariant"
  | "virtuality"
  | "partitivity"
  | "bundleOperator"
  | "bundleStart"
  | "bundleEnd";

export type PropAttributeGroup = "type" | "value" | "statement";

export type PropAttributeFilter = {
  [key in PropAttributeGroup]: PropAttributeName[];
};

export interface AttributeData {
  // id: string;
  certainty?: EntityEnums.Certainty;
  elvl?: EntityEnums.Elvl;
  logic?: EntityEnums.Logic;
  mood?: EntityEnums.Mood[];
  moodvariant?: EntityEnums.MoodVariant;
  virtuality?: EntityEnums.Virtuality;
  partitivity?: EntityEnums.Partitivity;
  bundleOperator?: EntityEnums.Operator;
  bundleStart?: boolean;
  bundleEnd?: boolean;
}
export interface PropAttributeGroupDataObject {
  statement: AttributeData;
  type: AttributeData;
  value: AttributeData;
}

export const classesAnnotator = [
  EntityEnums.Class.Action,
  EntityEnums.Class.Concept,
  EntityEnums.Class.Person,
  EntityEnums.Class.Group,
  EntityEnums.Class.Being,
  EntityEnums.Class.Object,
  EntityEnums.Class.Location,
  EntityEnums.Class.Event,
  EntityEnums.Class.Statement,
  EntityEnums.Class.Territory,
  EntityEnums.Class.Resource,
  EntityEnums.Class.Value,
];
export const classesEditorActants = [
  EntityEnums.Class.Concept,
  EntityEnums.Class.Person,
  EntityEnums.Class.Group,
  EntityEnums.Class.Being,
  EntityEnums.Class.Object,
  EntityEnums.Class.Location,
  EntityEnums.Class.Event,
  EntityEnums.Class.Statement,
  EntityEnums.Class.Territory,
  EntityEnums.Class.Resource,
  EntityEnums.Class.Value,
];
export const classesEditorTags = [
  EntityEnums.Class.Concept,
  EntityEnums.Class.Action,
  EntityEnums.Class.Person,
  EntityEnums.Class.Group,
  EntityEnums.Class.Being,
  EntityEnums.Class.Object,
  EntityEnums.Class.Location,
  EntityEnums.Class.Event,
  EntityEnums.Class.Territory,
  EntityEnums.Class.Resource,
  EntityEnums.Class.Value,
];
export const classesPropType = [EntityEnums.Class.Concept];
export const classesPropValue = [
  EntityEnums.Class.Concept,
  EntityEnums.Class.Action,
  EntityEnums.Class.Person,
  EntityEnums.Class.Group,
  EntityEnums.Class.Being,
  EntityEnums.Class.Object,
  EntityEnums.Class.Location,
  EntityEnums.Class.Event,
  EntityEnums.Class.Statement,
  EntityEnums.Class.Territory,
  EntityEnums.Class.Resource,
  EntityEnums.Class.Value,
];

export interface EntitySuggestion {
  entity: IEntity;
  icons?: React.ReactNode[];
}
export interface SuggesterItemToCreate {
  label: string;
  entityClass: EntityEnums.Class;
  detail?: string;
  territoryId?: string;
  language: EntityEnums.Language | false;
}

export interface FilteredActantObject {
  id: number;
  data: { actant?: IEntity; sActant: IStatementActant };
}
export interface FilteredActionObject {
  id: number;
  data: { action?: IEntity; sAction: IStatementAction };
}

export interface ITerritoryFilter {
  nonEmpty: boolean;
  starred: boolean;
  editorRights: boolean;
  filter: string;
}

export interface IExtendedResponseTree extends IResponseTree {
  foundByRecursion?: boolean;
}

export enum StatementListDisplayMode {
  TEXT = "text",
  LIST = "list",
}

// identifier for DnD useDrop
export declare type Identifier = string | symbol;

export interface EntitiesDeleteSuccessResponse {
  details: any;
  entityId: string;
}
export interface EntitiesDeleteErrorResponse {
  error: true;
  message: string;
  details: any;
  entityId: string;
}

export interface RelationsCreateSuccessResponse {
  relation: Relation.IRelation;
  details: AxiosResponse<any, any>;
}
export interface RelationsCreateErrorResponse {
  error: boolean;
  message: string;
  relation: Relation.IRelation;
  details: any;
}
export enum ButtonSize {
  Small = "S",
  Medium = "M",
  Large = "L",
}

export enum DetailBoxState {
  Minimized = "minimized",
  Normal = "normal",
  FullHeight = "fullHeight",
}
