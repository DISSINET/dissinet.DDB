import { EntityEnums } from "@shared/enums";
import { IEntity, IResponseDetail, IResponseGeneric } from "@shared/types";
import {
  EProtocolTieType,
  ITerritory,
  ITerritoryValidation,
} from "@shared/types/territory";
import { UseMutationResult } from "@tanstack/react-query";
import api from "api";
import { AxiosResponse } from "axios";
import { Button, Submit } from "components";
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { deepCopy } from "utils/utils";
import { EntityDetailSectionButtons } from "../EntityDetailSectionButtons/EntityDetailSectionButtons";
import {
  StyledBlockSeparator,
  StyledDetailSectionHeader,
  StyledValidationList,
} from "../EntityDetailStyles";
import { ValidationRule } from "components/advanced";

const initValidation: ITerritoryValidation = {
  detail: "",
  entityClasses: [],
  entityClassifications: [],
  entityLanguages: [],
  entityStatuses: [],
  allowedEntities: [],
  allowedClasses: [],
  propType: [],
  tieType: EProtocolTieType.Property,
};

interface EntityDetailValidationSection {
  validations?: ITerritoryValidation[];
  entities: Record<string, IEntity>;
  updateEntityMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric<any>, any>,
    Error,
    Partial<IEntity>,
    unknown
  >;
  userCanEdit: boolean;
  isInsideTemplate: boolean;
  territoryParentId: string | undefined;
  entity: IResponseDetail;
  setLoadingValidations: React.Dispatch<React.SetStateAction<boolean>>;
}
export const EntityDetailValidationSection: React.FC<
  EntityDetailValidationSection
> = ({
  validations,
  entities,
  updateEntityMutation,
  userCanEdit,
  isInsideTemplate,
  territoryParentId,
  entity,
  setLoadingValidations,
}) => {
  const [tempIndexToRemove, setTempIndexToRemove] = useState<false | number>(
    false
  );

  const initValidationRule = () => {
    const newValidation = { ...initValidation };
    newValidation.territoryId = entity.id;

    updateEntityMutation.mutate({
      data: {
        validations: validations
          ? [...validations, newValidation]
          : [newValidation],
      },
    });
  };

  const removeValidationRule = (indexToRemove: number) => {
    updateEntityMutation.mutate({
      data: {
        validations: validations?.filter((_, index) => index !== indexToRemove),
      },
    });
    setTempIndexToRemove(false);
  };

  const handleUpdateValidation = (
    key: number,
    changes: Partial<ITerritoryValidation>
  ) => {
    const validationsCopy = deepCopy(validations as ITerritoryValidation[]);
    const updatedObject: ITerritoryValidation = {
      ...validationsCopy[key],
      ...changes,
    };
    const newValidation = [
      ...validationsCopy.slice(0, key),
      updatedObject,
      ...validationsCopy.slice(key + 1),
    ];
    updateEntityMutation.mutate({
      data: {
        validations: newValidation,
      },
    });
  };

  const [showBatchRemoveSubmit, setShowBatchRemoveSubmit] = useState(false);

  return (
    <>
      <StyledDetailSectionHeader>
        Validation rules
        {userCanEdit && (
          <span style={{ marginLeft: "1rem", marginRight: "1rem" }}>
            <Button
              color="primary"
              label="rule"
              icon={<FaPlus />}
              onClick={initValidationRule}
            />
          </span>
        )}
        {userCanEdit && (
          <EntityDetailSectionButtons
            entityId={entity.id}
            suggesterCategoryTypes={[EntityEnums.Class.Territory]}
            setShowSubmit={setShowBatchRemoveSubmit}
            removeBtnTooltip="remove all validations from entity"
            removeBtnDisabled={
              entity.data.validations
                ? entity.data.validations.length === 0
                : true
            }
            handleCopyFromEntity={(pickedEntity, replace) => {
              setLoadingValidations(true);
              api.detailGet(pickedEntity.id).then((data) => {
                setLoadingValidations(false);
                const otherValidations = (data.data as ITerritory).data
                  .validations;
                if (otherValidations && otherValidations.length > 0) {
                  if (replace) {
                    updateEntityMutation.mutate({
                      data: {
                        validations: otherValidations,
                      },
                    });
                  } else {
                    if (validations) {
                      updateEntityMutation.mutate({
                        data: {
                          validations: [...validations, ...otherValidations],
                        },
                      });
                    } else {
                      updateEntityMutation.mutate({
                        data: {
                          validations: otherValidations,
                        },
                      });
                    }
                  }
                } else {
                  toast.info("no validations");
                }
              });
            }}
          />
        )}
      </StyledDetailSectionHeader>

      {validations && (
        <StyledValidationList>
          {(validations as ITerritoryValidation[]).map((validation, key) => {
            return (
              <React.Fragment key={key}>
                <ValidationRule
                  key={key}
                  validation={validation}
                  entities={entities}
                  updateValidationRule={(
                    changes: Partial<ITerritoryValidation>
                  ) => {
                    handleUpdateValidation(key, changes);
                  }}
                  removeValidationRule={() => setTempIndexToRemove(key)}
                  isInsideTemplate={isInsideTemplate}
                  territoryParentId={territoryParentId}
                  userCanEdit={userCanEdit}
                />
                {key !== validations.length - 1 && <StyledBlockSeparator />}
              </React.Fragment>
            );
          })}
        </StyledValidationList>
      )}

      {userCanEdit && validations && validations.length > 0 && (
        <div
          style={{ marginLeft: "1rem", marginRight: "1rem", marginTop: "2rem" }}
        >
          <Button
            color="primary"
            label="validation rule"
            icon={<FaPlus />}
            onClick={initValidationRule}
          />
        </div>
      )}

      <Submit
        show={tempIndexToRemove !== false}
        title="Remove validation rule"
        text="Do you really want to remove this validation rule?"
        onSubmit={() => {
          tempIndexToRemove !== false &&
            removeValidationRule(tempIndexToRemove);
        }}
        onCancel={() => setTempIndexToRemove(false)}
      />
      <Submit
        show={showBatchRemoveSubmit}
        title="Remove validation rules"
        text="Do you really want to remove all validation rules?"
        onSubmit={() => {
          updateEntityMutation.mutate({
            data: {
              validations: [],
            },
          });
          setShowBatchRemoveSubmit(false);
        }}
        onCancel={() => setShowBatchRemoveSubmit(false)}
      />
    </>
  );
};
