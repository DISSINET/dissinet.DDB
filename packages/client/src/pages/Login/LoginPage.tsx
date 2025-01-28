import { ContactOwnerFooting, Modal } from "components";
import { AttributeButtonGroup } from "components/advanced";
import React, { useMemo, useState } from "react";
import { FiLogIn } from "react-icons/fi";
import { IoEnter, IoReloadCircle } from "react-icons/io5";
import { Navigate } from "react-router";
import { StyledAttrBtnGroupWrap, StyledContentWrap } from "./LoginPageStyles";
import { GuestScreen } from "./screens/GuestScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PasswordRecoverScreen } from "./screens/PasswordRecoverScreen";

enum LoginMode {
  "login",
  "password",
  "guest",
}

export const LoginPage: React.FC = () => {
  const isGuestAccess = process.env.GUEST_MODE === "1";

  const [usernameLocal, setUsernameLocal] = useState("");
  const [password, setPassword] = useState("");
  const [emailLocal, setEmailLocal] = useState("");

  const [loginMode, setLoginMode] = useState<LoginMode>(
    isGuestAccess ? LoginMode.guest : LoginMode.login
  );
  const [restartScreen, setRestartScreen] = useState(false);
  const [redirectToMain, setRedirectToMain] = useState(false);

  const pageOptions = useMemo(() => {
    const options = [
      {
        icon: <FiLogIn />,
        longValue: "Log In",
        shortValue: "Log In",
        optionDisabled: false,
        onClick: () => {
          setLoginMode(LoginMode.login);
        },
        selected: loginMode === LoginMode.login,
      },
      {
        icon: <IoReloadCircle />,
        longValue: "Password reset",
        shortValue: "Password reset",
        optionDisabled: false,
        onClick: () => {
          setLoginMode(LoginMode.password);
        },
        selected: loginMode === LoginMode.password,
      },
    ];

    if (isGuestAccess) {
      options.push({
        icon: <IoEnter />,
        longValue: "Guest access",
        shortValue: "Guest access",
        optionDisabled: false,
        onClick: () => {
          setLoginMode(LoginMode.guest);
        },
        selected: loginMode === LoginMode.guest,
      });
    }
    return options;
  }, [loginMode, isGuestAccess]);

  const loginTitle = process.env.LOGIN_TITLE;
  const loginText = process.env.LOGIN_TEXT;

  return redirectToMain ? (
    <Navigate to="/" />
  ) : (
    <Modal showModal disableBgClick width={320}>
      <StyledContentWrap>
        {loginTitle && <h4>{loginTitle}</h4>}
        {loginText && (
          <p
            style={{
              fontSize: "1.8rem",
              color: "var(--color-greyer)",
              marginBottom: "0.5rem",
            }}
          >
            {loginText}
          </p>
        )}
        <StyledAttrBtnGroupWrap>
          <AttributeButtonGroup options={pageOptions} paddingX />
        </StyledAttrBtnGroupWrap>
        <div>
          {loginMode === LoginMode.login && (
            <LoginScreen
              usernameLocal={usernameLocal}
              setUsernameLocal={setUsernameLocal}
              password={password}
              setPassword={setPassword}
              setRedirectToMain={setRedirectToMain}
            />
          )}
          {loginMode === LoginMode.guest && (
            <GuestScreen setRedirectToMain={setRedirectToMain} />
          )}
          {loginMode === LoginMode.password && (
            <PasswordRecoverScreen
              emailLocal={emailLocal}
              setEmailLocal={setEmailLocal}
              restartScreen={restartScreen}
              setRestartScreen={setRestartScreen}
            />
          )}
        </div>
        <ContactOwnerFooting />
      </StyledContentWrap>
    </Modal>
  );
};

export default LoginPage;
