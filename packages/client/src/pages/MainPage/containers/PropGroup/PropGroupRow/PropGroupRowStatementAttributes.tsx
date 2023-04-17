import { certaintyDict, moodDict, operatorDict } from "@shared/dictionaries";
import { allEntities } from "@shared/dictionaries/entity";
import { IProp } from "@shared/types";
import { AttributeIcon, BundleButtonGroup, Dropdown } from "components";
import {
  ElvlButtonGroup,
  LogicButtonGroup,
  MoodVariantButtonGroup,
} from "components/advanced";
import React from "react";
import { PropAttributeFilter } from "types";
import {
  StyledAttributesFlexColumn,
  StyledAttributesFlexRow,
} from "./PropGroupRowStyles";

interface PropGroupRowStatementAttributes {
  prop: IProp;
  updateProp: (propId: string, changes: any) => void;
  isExpanded: boolean;
  disabledAttributes: PropAttributeFilter;
  userCanEdit: boolean;
}
export const PropGroupRowStatementAttributes: React.FC<
  PropGroupRowStatementAttributes
> = ({ prop, updateProp, isExpanded, disabledAttributes, userCanEdit }) => {
  return (
    <StyledAttributesFlexColumn>
      <StyledAttributesFlexRow>
        {/* Elvl */}
        {!disabledAttributes.statement?.includes("elvl") && (
          <ElvlButtonGroup
            border
            value={prop.elvl}
            onChange={(elvl) =>
              updateProp(prop.id, {
                ...prop,
                elvl: elvl,
              })
            }
          />
        )}
        {/* Logic */}
        {!disabledAttributes.statement?.includes("logic") && (
          <LogicButtonGroup
            border
            value={prop.logic}
            onChange={(logic) => updateProp(prop.id, { logic: logic })}
          />
        )}
        {/* mood */}
        {!disabledAttributes.statement?.includes("mood") && (
          <Dropdown
            width={100}
            isMulti
            disabled={!userCanEdit}
            placeholder="mood"
            tooltipLabel="mood"
            icon={<AttributeIcon attributeName="mood" />}
            options={moodDict}
            value={[allEntities]
              .concat(moodDict)
              .filter((i: any) => prop.mood.includes(i.value))}
            onChange={(newValue: any) => {
              updateProp(prop.id, {
                ...prop,
                mood: newValue ? newValue.map((v: any) => v.value) : [],
              });
            }}
          />
        )}
      </StyledAttributesFlexRow>
      {isExpanded && (
        <>
          <StyledAttributesFlexRow>
            {!disabledAttributes.statement?.includes("moodvariant") && (
              <MoodVariantButtonGroup
                border
                value={prop.moodvariant}
                onChange={(moodvariant) =>
                  updateProp(prop.id, {
                    ...prop,
                    moodvariant: moodvariant,
                  })
                }
              />
            )}
            {!disabledAttributes.statement?.includes("bundleOperator") && (
              <Dropdown
                width={50}
                placeholder="logical operator"
                tooltipLabel="logical operator"
                icon={<AttributeIcon attributeName="bundleOperator" />}
                disabled={!userCanEdit}
                options={operatorDict}
                value={operatorDict.find(
                  (i: any) => prop.bundleOperator === i.value
                )}
                onChange={(newValue: any) => {
                  updateProp(prop.id, {
                    ...prop,
                    bundleOperator: newValue.value,
                  });
                }}
              />
            )}
          </StyledAttributesFlexRow>
          <StyledAttributesFlexRow>
            <BundleButtonGroup
              bundleStart={prop.bundleStart}
              onBundleStartChange={(bundleStart) =>
                updateProp(prop.id, {
                  ...prop,
                  bundleStart: bundleStart,
                })
              }
              bundleEnd={prop.bundleEnd}
              onBundleEndChange={(bundleEnd) =>
                updateProp(prop.id, {
                  ...prop,
                  bundleEnd: bundleEnd,
                })
              }
            />
            {!disabledAttributes.statement?.includes("certainty") && (
              <Dropdown
                width={100}
                placeholder="certainty"
                tooltipLabel="certainty"
                icon={<AttributeIcon attributeName="certainty" />}
                disabled={!userCanEdit}
                options={certaintyDict}
                value={certaintyDict.find(
                  (i: any) => prop.certainty === i.value
                )}
                onChange={(newValue: any) => {
                  updateProp(prop.id, { ...prop, certainty: newValue.value });
                }}
              />
            )}
          </StyledAttributesFlexRow>
        </>
      )}
    </StyledAttributesFlexColumn>
  );
};
