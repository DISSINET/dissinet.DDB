import {
  Button,
  ContactAdminFooting,
  Input,
  Modal,
  ModalContent,
  ModalInputWrap,
} from "components";
import {
  StyledButtonWrap,
  StyledDescription,
  StyledErrorText,
  StyledInputRow,
  StyledMail,
} from "pages/PasswordReset/PasswordResetPageStyles";
import React, { useState } from "react";
import { FaTag, FaUserTag } from "react-icons/fa";
import { TbMailFilled } from "react-icons/tb";

const USERNAME_ALREADY_USED_ERROR = `Username <username> is already used. 
Please select a new one`;
const USERNAME_LENGTH_NOT_VALID_ERROR = `Username <username> is too short | too long. 
Please select a new one`;

interface UsernamePage {}
export const UsernamePage: React.FC<UsernamePage> = ({}) => {
  const [username, setUsername] = useState("");
  const urlParams = new URLSearchParams(window.location.search);
  const [email] = useState(urlParams.get("email") || "");
  const [error, setError] = useState<false | string>(false);

  const handleActivation = () => {
    // TODO: handle activation
    // const res = await api.activate(hash, password, passwordRepeat);
    // if (res.status === 200) {
    //   toast.success("user activated");
    //   navigate("/username");
    // }
  };

  return (
    <div>
      <Modal
        showModal
        disableBgClick
        width={300}
        // onEnterPress={handleActivation}
      >
        <ModalContent column centered>
          <p>Choose username for user</p>
          <StyledMail>
            <TbMailFilled size={14} style={{ marginRight: "0.5rem" }} />
            {email}
          </StyledMail>
          <StyledDescription>
            The username has to be unique and <br />
            between 2 and 10 characters long.
          </StyledDescription>
          <ModalInputWrap>
            <StyledInputRow>
              <FaTag size={14} style={{ marginRight: "0.7rem" }} />
              <Input
                placeholder="username"
                onChangeFn={(text: string) => setUsername(text)}
                value={username}
                changeOnType
                autoFocus
                required
              />
            </StyledInputRow>
          </ModalInputWrap>
          {error !== false && <StyledErrorText>{error}</StyledErrorText>}
          <StyledButtonWrap>
            <Button
              disabled={username.length < 2}
              icon={<FaUserTag />}
              label="Set username"
              color="success"
              onClick={handleActivation}
            />
          </StyledButtonWrap>
          <ContactAdminFooting />
        </ModalContent>
      </Modal>
    </div>
  );
};
