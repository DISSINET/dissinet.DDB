import { InterfaceEnums, UserEnums } from "@shared/enums";
import { useQueryClient } from "@tanstack/react-query";
import { heightHeader } from "Theme/constants";
import { PingColor } from "Theme/theme";
import LogoInkvisitor from "assets/logos/inkvisitor.svg";
import { Button, Loader } from "components";
import React, { useEffect, useState } from "react";
import { MdDarkMode, MdSunny } from "react-icons/md";
import { useLocation, useNavigate } from "react-router";
import { BeatLoader } from "react-spinners";
import { toast } from "react-toastify";
import { setTheme } from "redux/features/themeSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { getUserIcon } from "utils/utils";
import { Menu } from "..";
import packageJson from "../../../../package.json";
import {
  StyledFlexColumn,
  StyledFlexRow,
  StyledHeader,
  StyledHeaderLogo,
  StyledHeaderTag,
  StyledLoggedAsWrap,
  StyledMenu,
  StyledPingColor,
  StyledPingText,
  StyledRightHeader,
  StyledSandboxText,
  StyledSpace,
  StyledText,
  StyledThemeSwitcher,
  StyledThemeSwitcherIcon,
  StyledUser,
  StyledUserIconWrap,
  StyledUsername,
} from "./PageHeaderStyles";
import { IoSettingsSharp } from "react-icons/io5";
import { GlobalValidationsModal } from "../GlobalValidationsModal/GlobalValidationsModal";

interface LeftHeader {
  tempLocation: string | false;
}
export const LeftHeader: React.FC<LeftHeader> = React.memo(
  ({ tempLocation }) => {
    let env = (process.env.ROOT_URL || "").replace(/apps\/inkvisitor[-]?/, "");
    if (env === "/") {
      env = "";
    }

    const versionText = `v. ${packageJson.version}${
      env ? ` | ${env}` : ``
    } | built: ${process.env.BUILD_TIMESTAMP}`;

    const location = useLocation();
    const navigate = useNavigate();

    const queryClient = useQueryClient();

    const ping: number = useAppSelector((state) => state.ping);

    const [pingColor, setPingColor] = useState<keyof PingColor>("0");
    const [waitingForServerRestart, setWaitingForServerRestart] =
      useState(false);

    useEffect(() => {
      if ((ping === -1 || ping === -2) && !waitingForServerRestart) {
        setWaitingForServerRestart(true);
      } else if (ping >= 0 && waitingForServerRestart) {
        queryClient.invalidateQueries();
        setWaitingForServerRestart(false);
      }

      switch (true) {
        case ping === -2:
          setPingColor("-2");
          return;
        case ping === -1:
          setPingColor("-1");
          return;
        case ping < 100:
          setPingColor("5");
          return;
        case ping < 200:
          setPingColor("4");
          return;
        case ping < 300:
          setPingColor("3");
          return;
        case ping < 500:
          setPingColor("2");
          return;
        case ping < 1000:
          setPingColor("1");
          return;
        case ping > 1000:
          setPingColor("0");
          return;
      }
    }, [ping]);

    return (
      <StyledHeader>
        <StyledHeaderLogo
          height={heightHeader - 10}
          src={LogoInkvisitor}
          alt="Inkvisitor Logo"
          onClick={async () => {
            if (location.pathname !== "/") {
              navigate({
                pathname: "/",
                hash: tempLocation ? tempLocation : "",
              });
            } else {
              queryClient.invalidateQueries();
            }
          }}
        />
        <StyledFlexColumn>
          <StyledHeaderTag
            onClick={async () => {
              await navigator.clipboard.writeText(versionText);
              toast.info("Inkvisitor version copied to clipboard");
            }}
          >
            {versionText}
          </StyledHeaderTag>
          <StyledFlexRow>
            <StyledPingText style={{ marginLeft: "0.3rem" }}>
              {ping === -10 && "loading"}
              {ping === -2 && "Connection to server failed"}
              {ping === -1 && "Server is down"}
              {ping >= 0 && `Server connection latency:`}
            </StyledPingText>
            {ping === -10 && (
              <BeatLoader
                size={6}
                margin={4}
                style={{ marginLeft: "0.3rem", marginTop: "0.1rem" }}
                color="white"
              />
            )}
            {ping >= -2 && <StyledPingColor $pingColor={pingColor} />}
            {ping >= 0 && <StyledPingText>{ping}ms</StyledPingText>}
          </StyledFlexRow>
        </StyledFlexColumn>
      </StyledHeader>
    );
  }
);

interface RightHeader {
  setUserCustomizationOpen: (arg0: boolean) => void;
  userName: string;
  userRole: UserEnums.Role;
  tempLocation: string | false;
  setTempLocation: React.Dispatch<React.SetStateAction<string | false>>;
  handleLogOut: () => void;
  userIsFetching?: boolean;
}

export const RightHeader: React.FC<RightHeader> = React.memo(
  ({
    setUserCustomizationOpen,
    userName,
    userRole,
    tempLocation,
    setTempLocation,
    handleLogOut,
    userIsFetching = false,
  }) => {
    const env = (process.env.ROOT_URL || "").replace(
      /apps\/inkvisitor[-]?/,
      ""
    );

    const dispatch = useAppDispatch();
    const selectedThemeId: InterfaceEnums.Theme = useAppSelector(
      (state) => state.theme
    );

    const handleThemeChange = (newTheme: InterfaceEnums.Theme) => {
      dispatch(setTheme(newTheme));
      localStorage.setItem("theme", newTheme);
    };

    const usernameLoaded = userName.length > 0;

    const [showGlobalValidations, setShowGlobalValidations] = useState(false);

    return (
      <>
        {env === "sandbox" && (
          <>
            <StyledSandboxText>
              {
                "This is a sandbox version of InkVisitor, to be used for testing only. Do not store important data here; your data stored here can be deleted without previous notice."
              }
            </StyledSandboxText>
            <StyledSpace />
          </>
        )}
        <StyledRightHeader>
          <StyledThemeSwitcher
            onClick={() => {
              handleThemeChange(
                selectedThemeId === InterfaceEnums.Theme.Light
                  ? InterfaceEnums.Theme.Dark
                  : InterfaceEnums.Theme.Light
              );
            }}
          >
            <StyledThemeSwitcherIcon
              selected={selectedThemeId === InterfaceEnums.Theme.Light}
            >
              <MdSunny />
            </StyledThemeSwitcherIcon>
            <StyledThemeSwitcherIcon
              selected={selectedThemeId === InterfaceEnums.Theme.Dark}
            >
              <MdDarkMode />
            </StyledThemeSwitcherIcon>
          </StyledThemeSwitcher>

          {userRole === UserEnums.Role.Owner && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginRight: "1rem",
              }}
            >
              <Button
                radiusLeft
                radiusRight
                label="global validations"
                icon={<IoSettingsSharp />}
                onClick={() => setShowGlobalValidations(true)}
                color="greyer"
                inverted
              />
            </div>
          )}

          <StyledLoggedAsWrap>
            {userName.length > 0 && (
              <StyledUser>
                <StyledText>logged as</StyledText>

                <StyledUserIconWrap
                  onClick={() => setUserCustomizationOpen(true)}
                >
                  {getUserIcon(userRole, 19)}
                </StyledUserIconWrap>
                <StyledUsername onClick={() => setUserCustomizationOpen(true)}>
                  {userName}
                </StyledUsername>
              </StyledUser>
            )}

            {userIsFetching && !usernameLoaded && (
              <Loader size={16} show noBackground color={"headerTextColor"} />
            )}
          </StyledLoggedAsWrap>

          <StyledMenu>
            <Menu
              userRole={userRole}
              tempLocation={tempLocation}
              setTempLocation={setTempLocation}
              handleLogOut={handleLogOut}
            />
          </StyledMenu>
        </StyledRightHeader>

        {showGlobalValidations && (
          <GlobalValidationsModal
            setShowGlobalValidations={setShowGlobalValidations}
          />
        )}
      </>
    );
  }
);
