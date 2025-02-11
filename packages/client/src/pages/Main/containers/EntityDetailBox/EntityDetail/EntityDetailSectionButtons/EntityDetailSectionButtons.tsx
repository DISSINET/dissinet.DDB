import { classesAll } from "@shared/dictionaries/entity";
import { EntityEnums } from "@shared/enums";
import { IEntity } from "@shared/types";
import { Button, ButtonGroup } from "components";
import { AttributeButtonGroup, EntitySuggester } from "components/advanced";
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { MdDeleteSweep } from "react-icons/md";
import { TbReplace } from "react-icons/tb";
import { StyledSectionButtonsBorder } from "./EntityDetailSectionButtonsStyles";

interface EntityDetailSectionButtons {
  setShowSubmit: (value: React.SetStateAction<boolean>) => void;
  entityId: string;
  handleCopyFromEntity: (pickedEntity: IEntity, replace: boolean) => void;
  suggesterCategoryTypes?: EntityEnums.Class[];
  removeBtnTooltip: string;
  removeBtnDisabled: boolean;
}
export const EntityDetailSectionButtons: React.FC<
  EntityDetailSectionButtons
> = ({
  setShowSubmit,
  entityId,
  handleCopyFromEntity,
  suggesterCategoryTypes = classesAll,
  removeBtnTooltip,
  removeBtnDisabled,
}) => {
  const [replaceSection, setReplaceSection] = useState(false);

  return (
    <>
      <ButtonGroup
        $height={19}
        style={{ marginLeft: "0.5rem", marginRight: "0.5rem" }}
      >
        <Button
          disabled={removeBtnDisabled}
          icon={<MdDeleteSweep size={18} />}
          inverted
          color="danger"
          tooltipLabel={removeBtnTooltip}
          onClick={() => setShowSubmit(true)}
        />
        <StyledSectionButtonsBorder />
        <AttributeButtonGroup
          options={[
            {
              longValue: "append",
              shortValue: "",
              onClick: () => setReplaceSection(false),
              selected: !replaceSection,
              shortIcon: <FaPlus />,
            },
            {
              longValue: "replace",
              shortValue: "",
              onClick: () => setReplaceSection(true),
              selected: replaceSection,
              shortIcon: <TbReplace />,
            },
          ]}
        />
      </ButtonGroup>
      <EntitySuggester
        categoryTypes={suggesterCategoryTypes}
        onPicked={(entity: IEntity) =>
          handleCopyFromEntity(entity, replaceSection)
        }
        excludedActantIds={[entityId]}
        disableCreate
        inputWidth={90}
        placeholder="another Entity"
      />
    </>
  );
};
