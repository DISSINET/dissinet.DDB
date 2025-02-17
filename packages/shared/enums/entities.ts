export enum TerritoryType {
  Type1 = "1",
  Type2 = "2",
}

export namespace EntityEnums {
  // Helper function for testing if the class is part of PLOGESTRB group
  export const IsPLOGESTRB = (entityClass: Class): boolean => {
    return PLOGESTRB.indexOf(entityClass) !== -1;
  };

  // Helper function for testing if the class is part of PLOGESTR group
  export const IsPLOGESTR = (entityClass: Class): boolean => {
    return PLOGESTR.indexOf(entityClass) !== -1;
  };

  // Predicate for testing if input value is one of accepted class values
  export const IsClass = function (
    input: unknown,
    ...accepted: Class[]
  ): boolean {
    return accepted.indexOf(input as Class) !== -1;
  };

  export enum Class {
    Action = "A",
    Territory = "T",
    Statement = "S",
    Resource = "R",
    Person = "P",
    Being = "B",
    Group = "G",
    Object = "O",
    Concept = "C",
    Location = "L",
    Value = "V",
    Event = "E",
  }

  export enum Extension {
    Any = "*",
    Empty = "empty",
    NoClass = "X",
    Invalid = "?",
  }

  export type ExtendedClass = Class | Extension;

  export const PLOGESTR = [
    Class.Person,
    Class.Location,
    Class.Object,
    Class.Group,
    Class.Event,
    Class.Statement,
    Class.Territory,
    Class.Resource,
  ];
  export const PLOGESTRB = [
    Class.Person,
    Class.Location,
    Class.Object,
    Class.Group,
    Class.Event,
    Class.Statement,
    Class.Territory,
    Class.Resource,
    Class.Being,
  ];
  export const PLOGESTRBV = [
    Class.Person,
    Class.Location,
    Class.Object,
    Class.Group,
    Class.Event,
    Class.Statement,
    Class.Territory,
    Class.Resource,
    Class.Being,
    Class.Value,
  ];
  export const ExtendedClasses = [
    Class.Action,
    Class.Territory,
    Class.Statement,
    Class.Resource,
    Class.Person,
    Class.Being,
    Class.Group,
    Class.Object,
    Class.Concept,
    Class.Location,
    Class.Value,
    Class.Event,
    Extension.Empty,
  ];

  /**
   * Helper function for testing if input value is valid extended class value
   * @param input
   * @returns
   */
  export const IsExtendedClass = (input: unknown): boolean => {
    return (
      Object.values(Class).indexOf(input as any) !== -1 ||
      Object.values(Extension).indexOf(input as any) !== -1
    );
  };

  export enum LogicalType {
    Definite = "1",
    Indefinite = "2",
    Hypothetical = "3",
    Generic = "4",
  }

  export enum Status {
    Pending = "0",
    Approved = "1",
    Discouraged = "2",
    Warning = "3",
    Unfinished = "4",
  }

  export enum Certainty {
    Empty = "0",
    Certain = "1",
    AlmostCertain = "2",
    Probable = "3",
    Possible = "4",
    Dubious = "5",
    False = "6",
  }

  export enum Elvl {
    Textual = "1",
    Interpretive = "2",
    Inferential = "3",
  }

  export enum Position {
    Subject = "s",
    Actant1 = "a1",
    Actant2 = "a2",
    PseudoActant = "pa",
  }

  export enum UsedInPosition {
    Value = "value",
    Type = "type",
    Actant = "actant",
    Action = "action",
    Tag = "tag",
  }

  export enum Logic {
    Positive = "1",
    Negative = "2",
  }

  export enum Mood {
    Indication = "1",
    Question = "2",
    Condition = "3",
    Possibility = "4",
    Probability = "5",
    Certitude = "6",
    Wish = "7",
    Order = "8",
    Licence = "9",
    Ability = "10",
    Belief = "11",
    Allegation = "12",
    Semblance = "13",
    Rectitude = "14",
    Expectation = "15",
  }

  export enum MoodVariant {
    Realis = "1",
    Irrealis = "2",
    ToBeDecided = "3",
  }

  export enum Virtuality {
    Reality = "1",
    Possibility = "2",
    Probability = "3",
    Certitude = "4",
    Allegation = "5",
    Semblance = "6",
  }

  export enum Partitivity {
    Unison = "1",
    UnisonOrParts = "2",
    UnisonOrDiscreteParts = "3",
    Parts = "4",
    DiscreteParts = "5",
  }

  export enum Operator {
    Xor = "x",
    And = "a",
    Or = "o",
    Greater = ">",
    GreaterOrEqual = ">=",
    Equal = "=",
    LessOrEqual = "<=",
    Less = "<",
  }
  // ISO 639-2 codes
  export enum Language {
    Empty = "",
    Latin = "lat",
    English = "eng",
    MiddleEnglish = "enm",
    Occitan = "oci",
    Czech = "ces",
    Italian = "ita",
    French = "fra",
    German = "deu",
    Spanish = "spa",
    Hungarian = "hun",
    Polish = "pol",
    Portuguese = "por",
    Dutch = "dut",
    Chinese = "chi",
    Japanese = "jpn",
  }

  export enum ResourceType {
    Type1 = "1",
    Type2 = "2",
  }

  export enum TerritoryType {
    Type1 = "1",
    Type2 = "2",
  }

  export enum Order {
    First = -9999,
    Last = 9999,
  }

  export enum ConceptPartOfSpeech {
    Empty = "",
    Noun = "noun",
    Adj = "adj",
    Pron = "pron",
    Adv = "adv",
    Num = "num",
    Adp = "adp",
    CConj = "cconj",
    SConj = "sconj",
    Det = "det",
    Intj = "intj",
    Part = "part",
  }
  export enum ActionPartOfSpeech {
    Verb = "verb",
  }
}
