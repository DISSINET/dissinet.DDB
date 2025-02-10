import {
  IErrorSignature,
  PasswordDoesNotMatchError,
  PasswordResetHashError,
  UnsafePasswordError,
  getErrorByCode,
} from "@shared/types/errors";
import { SAFE_PASSWORD_DESCRIPTION } from "Theme/constants";
import api from "api";
import {
  Button,
  ContactOwnerFooting,
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
  StyledText,
} from "pages/AuthModalSharedStyles";
import React, { useEffect, useState } from "react";
import { BsEnvelopeArrowUpFill } from "react-icons/bs";
import { RiRotateLockLine } from "react-icons/ri";
import {
  TbArrowForwardUp,
  TbLockExclamation,
  TbLockPlus,
  TbMailFilled,
} from "react-icons/tb";
import { useNavigate } from "react-router";
import { isSafePassword } from "utils/utils";

interface PasswordResetPage {}
export const PasswordResetPage: React.FC<PasswordResetPage> = ({}) => {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [hash] = useState(urlParams.get("hash") || "");
  const [email] = useState(urlParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState<false | string>(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [hashOk, setHashOk] = useState(false);

  const testHash = async () => {
    try {
      const res = await api.passwordResetExists(hash, {
        ignoreErrorToast: true,
      });
      if (res.data.result) {
        setHashOk(true);
      } else {
        setError(PasswordResetHashError.message);
        setHashOk(false);
      }
    } catch (e) {
      setHashOk(false);
      setError(getErrorByCode(e as IErrorSignature).message);
    }
  };

  useEffect(() => {
    testHash();
  }, []);

  const handleReset = async () => {
    if (password !== passwordRepeat) {
      setError(PasswordDoesNotMatchError.message);
    } else {
      try {
        const res = await api.passwordSetRequest(
          hash,
          password,
          passwordRepeat
        );
        if (res.status === 200) {
          setPasswordSent(true);
        }
      } catch (err) {
        setError(getErrorByCode(err as IErrorSignature).message);
      }
    }
  };

  useEffect(() => {
    if (password.length > 0 && !isSafePassword(password)) {
      setError(UnsafePasswordError.message);
    } else if (passwordRepeat.length > 0 && password !== passwordRepeat) {
      setError(PasswordDoesNotMatchError.message);
    } else {
      setError(false);
    }
  }, [password, passwordRepeat]);

  return (
    <div>
      <Modal showModal disableBgClick width={320} onEnterPress={handleReset}>
        <ModalContent column centered>
          {!passwordSent ? (
            <>
              {hashOk && (
                <>
                  <p>Enter a new safe password for the user</p>
                  <StyledMail>
                    <TbMailFilled size={14} style={{ marginRight: "0.5rem" }} />
                    {email}
                  </StyledMail>
                  <StyledDescription>
                    {SAFE_PASSWORD_DESCRIPTION}
                  </StyledDescription>
                  <form>
                    <ModalInputWrap>
                      <StyledInputRow>
                        <TbLockPlus
                          size={16}
                          style={{ marginRight: "0.3rem" }}
                        />
                        <Input
                          type="password"
                          placeholder="new password"
                          onChangeFn={(text: string) => setPassword(text)}
                          value={password}
                          changeOnType
                          autoFocus
                          autocomplete="new-password"
                          required
                          borderColor={error !== false ? "danger" : undefined}
                        />
                      </StyledInputRow>
                    </ModalInputWrap>
                    <ModalInputWrap>
                      <StyledInputRow>
                        <TbLockExclamation
                          size={16}
                          style={{ marginRight: "0.3rem" }}
                        />
                        <Input
                          type="password"
                          placeholder="repeat password"
                          onChangeFn={(text: string) => setPasswordRepeat(text)}
                          value={passwordRepeat}
                          changeOnType
                          autocomplete="new-password"
                          required
                          borderColor={error !== false ? "danger" : undefined}
                        />
                      </StyledInputRow>
                    </ModalInputWrap>
                  </form>
                </>
              )}

              <div style={{ minHeight: "2rem" }}>
                {error !== false && <StyledErrorText>{error}</StyledErrorText>}
              </div>

              <StyledButtonWrap>
                {hashOk ? (
                  <Button
                    disabled={
                      error === UnsafePasswordError.message ||
                      error === PasswordDoesNotMatchError.message ||
                      password.length === 0 ||
                      passwordRepeat.length === 0
                    }
                    icon={<BsEnvelopeArrowUpFill />}
                    label="Reset Password"
                    color="success"
                    onClick={handleReset}
                  />
                ) : (
                  <Button
                    color="success"
                    icon={
                      <TbArrowForwardUp
                        style={{ transform: "rotate(180deg)" }}
                      />
                    }
                    label="back to login"
                    onClick={() => navigate("/login")}
                  />
                )}
              </StyledButtonWrap>
            </>
          ) : (
            <>
              <StyledText>{`The password for the user`}</StyledText>
              <StyledMail>
                <TbMailFilled size={14} style={{ marginRight: "0.5rem" }} />
                {`${email}`}
              </StyledMail>
              <StyledText>{"was changed."}</StyledText>
              <RiRotateLockLine size={30} style={{ margin: "1.5rem" }} />
              <StyledButtonWrap>
                <Button
                  icon={
                    <TbArrowForwardUp style={{ transform: "rotate(180deg)" }} />
                  }
                  label="Back to login"
                  color="success"
                  onClick={() => navigate("/login")}
                />
              </StyledButtonWrap>
            </>
          )}

          {/* <ContactOwnerFooting /> */}
        </ModalContent>
      </Modal>
    </div>
  );
};
