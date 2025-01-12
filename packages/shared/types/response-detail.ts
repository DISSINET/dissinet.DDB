/**
 * Very extensive object showing all the details about one actant
 */

import { IEntity, IResponseEntity, IStatement, IWarning, Relation } from ".";
import { EntityEnums } from "../enums";
import { IDocumentMeta } from "./document";
import {
  IStatementClassification,
  IStatementIdentification,
} from "./statement";
import { ITerritoryValidation } from "./territory";

export interface IResponseDetail extends IResponseEntity {
  entities: Record<string, IEntity>; // all entities from IStatement and entityIds...
  usedInStatements: IResponseUsedInStatement<EntityEnums.UsedInPosition>[]; // all statements, where the detail id is used as an actant, action, or tag
  usedInStatementProps: IResponseUsedInStatementProps[]; // all statements, where the detail id is used in props
  usedInMetaProps: IResponseUsedInMetaProp[]; // all entities, where the detail id is used in props (entity.props[])

  usedInDocuments: IResponseUsedInDocument[]; // all documents, where the detail id is used

  usedInStatementIdentifications: IResponseUsedInStatementIdentification[]; // statement.data.actants[].identifications + from usedInStatements field if actant.entityId = detailId
  usedInStatementClassifications: IResponseUsedInStatementClassification[]; // statement.data.actants[].classifications + from usedInStatements field if actant.entityId = detailId

  usedAsTemplate?: string[];

  relations: Relation.IUsedRelations;

  warnings: IWarning[];
  legacyValidations?: ITerritoryValidationNode; // applicable only to T entities
}

// legacy validations will be returned in a form of a tree / set of nodes ranging from the parent T to the root territory. In each node, there will be a list of validations for the territory.
export interface ITerritoryValidationNode {
  territoryId: string;
  validations: ITerritoryValidation[];
  parent: ITerritoryValidationNode | null;
}

// model is reapeated for each anchor in each document,
// so e.g., when the entity is used in 2 documents, and in one document it is used in 3 anchors, in the second is used in 1 anchor, model will be repeated 4 times
export interface IResponseUsedInDocument {
  document: IDocumentMeta;
  anchorText: string; // content of the anchor
  resourceId: string; // resource linked to the document
  parentTerritoryId: string; // id of the closest territory anchor in the document, "" if no territory is found
}

export interface IResponseUsedInStatement<PositionEnum> {
  statement: IStatement;
  position: PositionEnum;
}

export interface IResponseUsedInStatementProps {
  statementId: string;
  typeId: string;
  valueId: string;
  originId: string; // what entity is the detail id used for
}

export interface IResponseUsedInMetaProp {
  typeId: string;
  valueId: string;
  originId: string; // what entity is the detail id used for
}

export interface IResponseUsedInStatementIdentification {
  statementId: string;
  actantEntityId: string;
  relationEntityId: string;
  data: IStatementIdentification;
}

export interface IResponseUsedInStatementClassification {
  statementId: string;
  actantEntityId: string;
  relationEntityId: string;
  data: IStatementClassification; // this is a duplicate in some values, but probably the cleanest possible way
}
