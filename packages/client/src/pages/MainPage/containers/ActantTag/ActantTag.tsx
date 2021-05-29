import React, { ReactNode } from "react";
import { Tag } from "components";
import { IActant, IEntity } from "@shared/types";

const classes = {
  T: {
    id: "T",
    label: "Territory",
    color: "entityT",
  },
  R: {
    id: "R",
    label: "Territory",
    color: "entityR",
  },
  A: {
    id: "A",
    label: "Action",
    color: "entityA",
  },
  S: {
    id: "S",
    label: "Statement",
    color: "entityS",
  },
  C: {
    id: "C",
    label: "Concept",
    color: "entityC",
  },
  E: {
    id: "E",
    label: "Event",
    color: "entityE",
  },
  G: {
    id: "G",
    label: "Group",
    color: "entityG",
  },
  L: {
    id: "L",
    label: "Location",
    color: "entityL",
  },
  O: {
    id: "O",
    label: "Object",
    color: "entityO",
  },
  P: {
    id: "P",
    label: "Person",
    color: "entityP",
  },
  V: {
    id: "V",
    label: "Value",
    color: "entityV",
  },
};

interface IActantTag {
  actant: IActant | IEntity;
  mode?: "selected" | "disabled" | "invalid" | false;
  short?: boolean;
  button?: ReactNode;
  propId?: string;
  index?: number;
  moveFn?: (dragIndex: number, hoverIndex: number) => void;
  isSelected?: boolean;
  enableTooltip?: boolean;
}

export const ActantTag: React.FC<IActantTag> = ({
  actant,
  short = false,
  mode,
  button,
  index,
  moveFn,
  isSelected,
  enableTooltip = false,
}) => {
  const classId = actant.class;
  const classObject = classes[classId];

  return (
    <Tag
      propId={actant.id}
      label={actant.label}
      short={short}
      button={button}
      moveFn={moveFn}
      category={classId}
      color={classObject.color}
      mode={mode}
      borderStyle="solid"
      invertedLabel={isSelected}
      index={index}
      enableTooltip={enableTooltip}
    />
  );
};
