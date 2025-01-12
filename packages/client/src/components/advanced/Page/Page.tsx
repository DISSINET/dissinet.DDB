import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import { Header, Loader, Toast } from "components";
import {
  LeftHeader,
  RightHeader,
  UserCustomizationModal,
} from "components/advanced";
import { useSearchParams } from "hooks";
import useKeyLift from "hooks/useKeyLift";
import useKeypress from "hooks/useKeyPress";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Id, toast } from "react-toastify";
import { setPing } from "redux/features/pingSlice";
import { setLastClickedIndex } from "redux/features/statementList/lastClickedIndexSlice";
import { setUsername } from "redux/features/usernameSlice";
import { useAppDispatch, useAppSelector } from "redux/hooks";
import { ThemeColor } from "Theme/theme";
import { StyledPage, StyledPageContent } from "./PageStyles";
import { UserEnums } from "@shared/enums";

interface Page {
  children?: React.ReactNode;
}
export const Page: React.FC<Page> = ({ children }) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const lastClickedIndex: number = useAppSelector(
    (state) => state.statementList.lastClickedIndex
  );
  const userId = localStorage.getItem("userid");
  const userRole = localStorage.getItem("userrole") as UserEnums.Role;
  const { cleanAllParams } = useSearchParams();

  const layoutWidth: number = useAppSelector(
    (state) => state.layout.layoutWidth
  );
  const contentHeight: number = useAppSelector(
    (state) => state.layout.contentHeight
  );

  let environmentName = (process.env.ROOT_URL || "").replace(
    /apps\/inkvisitor[-]?/,
    ""
  );
  if (environmentName === "/") {
    environmentName = "";
  }

  const location = useLocation();
  const navigate = useNavigate();

  const disableRightHeader: boolean =
    location.pathname === "/login" ||
    location.pathname === "/activate" ||
    location.pathname === "/password_reset";

  const {
    status: statusUser,
    data: user,
    error: errorUser,
    isFetching: isFetchingUser,
    isPaused,
  } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      if (userId) {
        const res = await api.usersGet(userId);
        return res.data;
      }
    },
    enabled: api.isLoggedIn() && !disableRightHeader,
  });

  const toastId = React.useRef<Id | null>(null);
  const notify = () =>
    (toastId.current = toast.dark("you're offline", { autoClose: false }));

  useEffect(() => {
    if (isPaused) {
      notify();
    } else {
      if (toastId.current && toast.isActive(toastId.current)) {
        toast.dismiss(toastId.current);
      }
    }
  }, [isPaused]);

  const logOutMutation = useMutation({
    mutationFn: async () => await api.signOut(),
    onSuccess: (data, variables) => {
      dispatch(setUsername(""));
      queryClient.removeQueries();
      toast.success("You've been successfully logged out!");

      cleanAllParams();

      navigate("/login");
    },
  });

  const [userCustomizationOpen, setUserCustomizationOpen] =
    useState<boolean>(false);

  const [tempLocation, setTempLocation] = useState<string | false>(false);

  useKeypress("Shift", () => document.body.classList.add("no-select"));
  useKeyLift("Shift", () => document.body.classList.remove("no-select"));

  useQuery({
    queryKey: ["ping"],
    queryFn: async () => {
      const localPing = api.getPing();
      if (localPing) {
        dispatch(setPing(localPing));
      }
      return localPing;
    },
    refetchInterval: 5000,
  });

  const headerLeft = useMemo(
    () => <LeftHeader tempLocation={tempLocation} />,
    [tempLocation]
  );

  const headerRight = useMemo<undefined | JSX.Element>(() => {
    if (disableRightHeader) {
      return undefined;
    }
    return (
      <RightHeader
        setUserCustomizationOpen={setUserCustomizationOpen}
        handleLogOut={logOutMutation.mutate}
        userName={user?.name ?? ""}
        userRole={userRole || ""}
        setTempLocation={setTempLocation}
        tempLocation={tempLocation}
        userIsFetching={isFetchingUser}
      />
    );
  }, [user?.name, userRole, isFetchingUser, tempLocation, disableRightHeader]);

  const handleClick = useCallback(() => {
    if (lastClickedIndex !== -1) {
      dispatch(setLastClickedIndex(-1));
    }
  }, [lastClickedIndex]);

  const contentEl = useMemo(() => {
    if (contentHeight > 0) {
      return children;
    } else {
      return <Loader show />;
    }
  }, [contentHeight > 0]);

  return (
    <StyledPage $layoutWidth={layoutWidth} onClick={handleClick}>
      <Header
        paddingY={0}
        paddingX={10}
        color={
          ["production", ""].indexOf(environmentName) === -1
            ? (environmentName as keyof ThemeColor)
            : "muni"
        }
        left={headerLeft}
        right={headerRight}
      />

      <StyledPageContent id="page" height={contentHeight}>
        {contentEl}
      </StyledPageContent>

      {user && userCustomizationOpen && (
        <UserCustomizationModal
          user={user}
          onClose={() => setUserCustomizationOpen(false)}
        />
      )}
      <Toast />
    </StyledPage>
  );
};
