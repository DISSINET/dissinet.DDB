import { EntityEnums, UserEnums } from "@shared/enums";
import { IEntity, IResponseGeneric } from "@shared/types";
import {
  UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "api";
import { AxiosResponse } from "axios";
import {
  Button,
  ButtonGroup,
  Input,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalInputForm,
  ModalInputLabel,
  ModalInputWrap,
} from "components";
import { CTemplateEntity } from "constructors";
import { useSearchParams } from "hooks";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { getShortLabelByLetterCount } from "utils/utils";

interface EntityDetailCreateTemplateModal {
  showModal: boolean;
  entity: IEntity;
  userCanEdit: boolean;
  setCreateTemplateModal: React.Dispatch<React.SetStateAction<boolean>>;
  updateEntityMutation: UseMutationResult<
    AxiosResponse<IResponseGeneric>,
    unknown,
    Partial<IEntity>,
    unknown
  >;
}
export const EntityDetailCreateTemplateModal: React.FC<
  EntityDetailCreateTemplateModal
> = ({
  entity,
  showModal = false,
  userCanEdit,
  setCreateTemplateModal,
  updateEntityMutation,
}) => {
  const queryClient = useQueryClient();
  const [createTemplateLabel, setCreateTemplateLabel] = useState<string>("");

  const { statementId, selectedDetailId, appendDetailId } = useSearchParams();

  const templateCreateMutation = useMutation({
    mutationFn: async (templateEntity: IEntity) =>
      await api.entityCreate(templateEntity),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      if (statementId && variables.class === EntityEnums.Class.Statement) {
        queryClient.invalidateQueries({ queryKey: ["statement-templates"] });
      }
      if (selectedDetailId) {
        queryClient.invalidateQueries({ queryKey: ["entity-templates"] });
      }
      updateEntityMutation.mutate({ usedTemplate: variables.id });

      appendDetailId(variables.id);

      setCreateTemplateModal(false);
      setCreateTemplateLabel("");

      toast.info(
        `Template [${variables.class}]: "${getShortLabelByLetterCount(
          variables.labels[0],
          120
        )}" created from entity "${getShortLabelByLetterCount(
          entity.labels[0],
          120
        )}"`
      );
    },
  });

  const handleCreateTemplate = () => {
    // create template as a copy of the entity
    const templateEntity = CTemplateEntity(
      localStorage.getItem("userrole") as UserEnums.Role,
      entity,
      createTemplateLabel
    );
    templateCreateMutation.mutate(templateEntity);
  };

  const handleCancelCreateTemplate = () => {
    setCreateTemplateModal(false);
    setCreateTemplateLabel("");
  };

  return (
    <Modal
      showModal={showModal}
      width="auto"
      onEnterPress={() => {
        handleCreateTemplate();
      }}
      onClose={() => {
        handleCancelCreateTemplate();
      }}
    >
      <ModalHeader title="Create Template" />
      <ModalContent>
        <ModalInputForm>
          <ModalInputLabel>Label</ModalInputLabel>
          <ModalInputWrap>
            <Input
              disabled={!userCanEdit}
              width="full"
              value={createTemplateLabel}
              onChangeFn={async (newLabel: string) => {
                setCreateTemplateLabel(newLabel);
              }}
              changeOnType
              autoFocus
            />
          </ModalInputWrap>
        </ModalInputForm>
      </ModalContent>
      <ModalFooter>
        <ButtonGroup>
          <Button
            key="cancel"
            label="Cancel"
            color="greyer"
            inverted
            onClick={() => {
              handleCancelCreateTemplate();
            }}
          />
          <Button
            key="submit"
            label="Create"
            color="info"
            onClick={() => {
              handleCreateTemplate();
            }}
          />
        </ButtonGroup>
      </ModalFooter>
    </Modal>
  );
};
