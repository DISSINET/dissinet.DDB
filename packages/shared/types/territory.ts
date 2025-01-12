import { EntityEnums } from "../enums";
import { IEntity } from "./entity";

export interface ITerritory extends IEntity {
  class: EntityEnums.Class.Territory;
  data: ITerritoryData;
}

export interface ITerritoryData {
  protocol?: ITerritoryProtocol;
  parent: IParentTerritory | false; // TODO should be optional instead of false
  validations?: ITerritoryValidation[];
}

export interface IParentTerritory {
  territoryId: string;
  order: number;
}

export interface ITerritoryProtocol {
  project: string;
  dataCollectionMethods: string[]; // C class entities
  description: string;
  guidelines: string[]; // R class entities
  detailedProtocols: string[]; // R class entities
  startDate: string; // V class entity
  endDate: string; // V class entity
  relatedDataPublications: string[]; // R class entities
}

export interface ITerritoryValidation {
  active?: boolean;
  territoryId?: string;
  entityClasses?: EntityEnums.Class[];
  entityClassifications?: string[];
  entityLanguages?: EntityEnums.Language[];
  entityStatuses?: EntityEnums.Status[];

  tieType: EProtocolTieType; // default is property
  propType?: string[]; // relevant only in case of Property is selected as a tie
  allowedClasses?: EntityEnums.Class[]; // not relevant if allowedEntities is set
  allowedEntities?: string[]; //
  detail: string;
}

export enum EProtocolTieType {
  Property = "Property",
  Classification = "Classification",
  Reference = "Reference",
}
