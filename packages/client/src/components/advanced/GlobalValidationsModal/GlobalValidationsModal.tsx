import {
  EProtocolTieType,
  ITerritoryValidation,
} from "@shared/types/territory";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import {
  Button,
  ButtonGroup,
  Loader,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Submit,
} from "components";
import { ValidationRule } from "components/advanced";
import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaToggleOff, FaToggleOn } from "react-icons/fa";
import { rootTerritoryId } from "Theme/constants";
import {
  StyledBlockSeparator,
  StyledGridForm,
  StyledGridFormLabel,
  StyledGridSectionHeading,
  StyledSectionHeader,
  StyledToggleWrap,
  StyledValidationCount,
  StyledValidationList,
} from "./GlobalValidationsModalStyles";
import { deepCopy } from "utils/utils";
import { IEntity } from "@shared/types";
import { useSearchParams } from "hooks";
import {
  entityKeys,
  territoryKeys,
  valencyKeys,
  globalValidationsDict,
  ValidationKey,
} from "@shared/enums/warning";
import { GlobalValidationsSettingsRow } from "./GlobalValidationsSettingsRow";
import { ISetting } from "@shared/types/settings";
import { toast } from "react-toastify";

const initialRulesState: Record<ValidationKey, boolean> = Object.keys(
  globalValidationsDict
).reduce((acc, key) => {
  acc[key as ValidationKey] = true;
  return acc;
}, {} as Record<ValidationKey, boolean>);

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

interface GlobalValidationsModal {
  setShowGlobalValidations: React.Dispatch<React.SetStateAction<boolean>>;
}
export const GlobalValidationsModal: React.FC<GlobalValidationsModal> = ({
  setShowGlobalValidations,
}) => {
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    setShowModal(true);
  }, []);

  const {
    status,
    data: rootTerritory,
    error: entityError,
    isFetching,
  } = useQuery({
    queryKey: ["entity", rootTerritoryId],
    queryFn: async () => {
      const res = await api.detailGet(rootTerritoryId);
      return res.data;
    },
    enabled: api.isLoggedIn(),
  });

  const {
    status: settingsStatus,
    data: settings,
    error: settingsError,
    isFetching: settingsIsFetching,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.settingGroupGet("validations");
      return res.data.data?.settings;
    },
    enabled: api.isLoggedIn(),
  });

  const validations = rootTerritory?.data.validations || [];

  const queryClient = useQueryClient();

  const updateEntityMutation = useMutation({
    mutationFn: async (changes: Partial<IEntity>) =>
      await api.entityUpdate(rootTerritoryId, changes),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entity"] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Omit<ISetting, "public">[]) =>
      await api.settingGroupUpdate("validations", newSettings),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("settings updated");
    },
  });

  const [tempIndexToRemove, setTempIndexToRemove] = useState<false | number>(
    false
  );

  const initValidationRule = () => {
    updateEntityMutation.mutate({
      data: {
        validations: validations
          ? [...validations, initValidation]
          : [initValidation],
      },
    });
  };

  const removeValidationRule = (indexToRemove: number) => {
    updateEntityMutation.mutate({
      data: {
        validations: (validations as ITerritoryValidation[])?.filter(
          (_, index) => index !== indexToRemove
        ),
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

  const [rules, setRules] =
    useState<Record<ValidationKey, boolean>>(initialRulesState);

  const settingsKeyValue = useMemo(
    () =>
      settings?.reduce((acc, setting) => {
        acc[setting.id as ValidationKey] = setting.value as boolean;
        return acc;
      }, {} as Record<ValidationKey, boolean>),
    [settings]
  );

  useEffect(() => {
    if (settingsKeyValue) {
      setRules(settingsKeyValue);
    }
  }, [JSON.stringify(settingsKeyValue)]);

  const toggleRule = (key: ValidationKey) => {
    setRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const newSettings: Omit<ISetting, "public">[] = Object.entries(rules).map(
      ([id, value]) => ({ id, value })
    );
    updateSettingsMutation.mutate(newSettings);
  }, [rules]);

  return (
    <>
      <Modal
        showModal={showModal}
        onClose={() => setShowGlobalValidations(false)}
        width={650}
      >
        <ModalHeader
          title="Global validations"
          boldTitle
          onClose={() => setShowGlobalValidations(false)}
        />
        <ModalContent column enableScroll>
          {/* <StyledGridForm>
            <StyledGridSectionHeading>
              Valency validations
            </StyledGridSectionHeading>
            <div />
            {valencyKeys.map((val, key) => (
              <GlobalValidationsSettingsRow
                key={key}
                validation={val}
                active={rules[val]}
                toggleRule={() => toggleRule(val)}
              />
            ))}

            <StyledGridSectionHeading>
              Entity validations
            </StyledGridSectionHeading>
            <div />
            {entityKeys.map((val, key) => (
              <GlobalValidationsSettingsRow
                key={key}
                validation={val}
                active={rules[val]}
                toggleRule={() => toggleRule(val)}
              />
            ))}

            <StyledGridSectionHeading>
              Territory validations
            </StyledGridSectionHeading>
            <div />
            {territoryKeys.map((val, key) => (
              <GlobalValidationsSettingsRow
                key={key}
                validation={val}
                active={rules[val]}
                toggleRule={() => toggleRule(val)}
              />
            ))}
          </StyledGridForm> */}

          {rootTerritory && (
            <>
              <StyledSectionHeader>
                <b>Root T validation</b>
                <StyledValidationCount>{`${validations?.length} Root T validations`}</StyledValidationCount>
                <span>
                  <Button
                    icon={<FaPlus />}
                    label="new validation rule"
                    color="primary"
                    onClick={initValidationRule}
                  />
                </span>
              </StyledSectionHeader>
              <StyledValidationList>
                {(validations as ITerritoryValidation[])?.map(
                  (validation, key) => {
                    return (
                      <React.Fragment key={key}>
                        <ValidationRule
                          key={key}
                          validation={validation}
                          entities={rootTerritory.entities}
                          updateValidationRule={(
                            changes: Partial<ITerritoryValidation>
                          ) => {
                            handleUpdateValidation(key, changes);
                          }}
                          removeValidationRule={() => {
                            setTempIndexToRemove(key);
                          }}
                          isInsideTemplate={false}
                          userCanEdit
                        />
                        {key !== validations.length - 1 && (
                          <StyledBlockSeparator />
                        )}
                      </React.Fragment>
                    );
                  }
                )}
              </StyledValidationList>
              <div style={{ marginTop: "2rem" }}>
                <Button
                  icon={<FaPlus />}
                  label="new validation rule"
                  color="primary"
                  onClick={initValidationRule}
                />
              </div>
            </>
          )}

          <Loader show={isFetching || updateEntityMutation.isPending} />
        </ModalContent>
        <ModalFooter>
          <ButtonGroup>
            <Button
              color="success"
              label="done"
              onClick={() => setShowGlobalValidations(false)}
            />
          </ButtonGroup>
        </ModalFooter>
      </Modal>

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
    </>
  );
};
