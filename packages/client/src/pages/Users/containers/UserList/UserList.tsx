import { userRoleDict } from "@shared/dictionaries";
import { EntityEnums, UserEnums } from "@shared/enums";
import { IResponseUser, IUser, IUserRight } from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "api";
import { Button, ButtonGroup, Loader, Submit } from "components";
import {
  AttributeButtonGroup,
  EntitySuggester,
  EntityTag,
} from "components/advanced";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaEnvelopeOpenText,
  FaKey,
  FaToggleOff,
  FaToggleOn,
  FaTrashAlt,
} from "react-icons/fa";
import { CellProps, Column, Row, useTable } from "react-table";
import { toast } from "react-toastify";
import { getUserIcon } from "utils/utils";
import { UserListEmailInput } from "./UserListEmailInput/UserListEmailInput";
import { UserListIcon } from "./UserListIcon/UserListIcon";
import {
  StyledNotActiveText,
  StyledTHead,
  StyledTable,
  StyledTableWrapper,
  StyledTerritoryColumn,
  StyledTerritoryColumnAllLabel,
  StyledTerritoryList,
  StyledTerritoryListItem,
  StyledTerritoryListItemMissing,
  StyledTh,
  StyledUserNameColumn,
  StyledUserNameColumnIcon,
  StyledUserNameColumnText,
} from "./UserListStyles";
import { UserListTableRow } from "./UserListTableRow/UserListTableRow";
import { UserListUsernameInput } from "./UserListUsernameInput/UserListUsernameInput";
import { UsersUtils } from "./UsersUtils";

const rolePriority: Record<UserEnums.Role, number> = {
  [UserEnums.Role.Owner]: 1,
  [UserEnums.Role.Admin]: 2,
  [UserEnums.Role.Editor]: 3,
  [UserEnums.Role.Viewer]: 4,
};

type CellType = CellProps<IResponseUser>;

interface UserList {}

export const UserList: React.FC<UserList> = React.memo(() => {
  const [removingUserId, setRemovingUserId] = useState<false | string>("");

  const queryClient = useQueryClient();

  const {
    status,
    data: users,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.usersGetMore({});
      return res.data.sort((a, b) => (a.id > b.id ? 1 : -1));
    },
    enabled: api.isLoggedIn(),
  });

  const [localUsers, setLocalUsers] = useState<IResponseUser[]>([]);

  const userComparator = (a: IResponseUser, b: IResponseUser): number => {
    // First, compare by role priority
    if (rolePriority[a.role] !== rolePriority[b.role]) {
      return rolePriority[a.role] - rolePriority[b.role];
    }

    // If roles are the same, compare by active status
    return b.active ? 1 : -1;
  };

  useEffect(() => {
    if (users) {
      setLocalUsers(users.sort(userComparator));
    }
  }, [users]);

  const removingUser = useMemo(() => {
    return removingUserId ? users?.find((d) => d.id === removingUserId) : false;
  }, [removingUserId]);

  const userMutation = useMutation({
    mutationFn: async (
      userChanges: Partial<Omit<IUser, "id">> & { id: IUser["id"] }
    ) => await api.usersUpdate(userChanges.id, userChanges),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => await api.resetPassword(userId),
    onSuccess: (data, variables) => {
      const { message } = data.data;

      toast.info(message, {
        autoClose: 6000,
        closeOnClick: false,
        onClick: () => {
          navigator.clipboard.writeText(message ? message.split("'")[1] : "");
          toast.info("Password copied to clipboard");
        },
        closeButton: true,
        draggable: false,
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (user: IResponseUser) => await api.usersDelete(user.id),
    onSuccess: (data, variables) => {
      toast.warning(`User ${variables.name} removed!`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setRemovingUserId(false);
    },
  });

  const addRightToUser = (
    user: IResponseUser,
    territoryId: string,
    mode: "read" | "write"
  ) => {
    // remove this territory from the list if it was added before
    const newRights: IUserRight[] = [
      ...user.rights.filter((right) => right.territory !== territoryId),
    ];
    newRights.push({
      territory: territoryId,
      mode: mode as UserEnums.RoleMode,
    });
    userMutation.mutate({ id: user.id, rights: newRights });
  };

  const removeRightFromUser = (user: IResponseUser, territoryId: string) => {
    const newRights: IUserRight[] = [
      ...user.rights.filter((right) => right.territory !== territoryId),
    ];
    userMutation.mutate({ id: user.id, rights: newRights });
  };

  const getRowId = useCallback((row: IResponseUser) => {
    return row.id;
  }, []);

  const columns = useMemo<Column<IResponseUser>[]>(
    () => [
      {
        Header: "",
        id: "Name",
        accessor: "name",
        Cell: ({ row }: CellType) => {
          const { name, email, role, active, verified } = row.original;

          return (
            <StyledUserNameColumn $active={active} $verified={verified}>
              <StyledUserNameColumnIcon>
                <UserListIcon
                  icon={
                    !verified ? (
                      <FaEnvelopeOpenText size={16} />
                    ) : (
                      getUserIcon(role)
                    )
                  }
                  tooltipLabel={role}
                />
              </StyledUserNameColumnIcon>

              {!verified ? (
                <StyledNotActiveText>
                  <span>Verification email has been sent to</span>
                  <b>{email}</b>
                </StyledNotActiveText>
              ) : (
                <StyledUserNameColumnText>
                  <b>{name}</b>
                  <span>{email}</span>
                </StyledUserNameColumnText>
              )}
            </StyledUserNameColumn>
          );
        },
      },
      {
        Header: "Username",
        id: "Username",
        Cell: ({ row, rows }: CellType) => {
          const { verified } = row.original;

          return (
            <>
              {verified && (
                <UserListUsernameInput
                  user={row.original}
                  userMutation={userMutation}
                  rows={rows}
                />
              )}
            </>
          );
        },
      },
      {
        Header: "Email",
        id: "Email",
        Cell: ({ row }: CellType) => {
          const { verified, email } = row.original;
          return verified ? (
            <UserListEmailInput
              user={row.original}
              userMutation={userMutation}
            />
          ) : null;
        },
      },
      {
        Header: "Role",
        id: "Role",
        Cell: ({ row }: CellType) => {
          const { id, role } = row.original;
          return (
            <AttributeButtonGroup
              disabled={
                id === localStorage.getItem("userid") ||
                role === UserEnums.Role.Owner
              }
              options={
                role === UserEnums.Role.Owner
                  ? [
                      {
                        longValue: userRoleDict[0].label,
                        shortValue: userRoleDict[0].label,
                        selected: role === userRoleDict[0].value,
                        onClick: () => {
                          userMutation.mutate({
                            id: id,
                            role: userRoleDict[0].value,
                          });
                        },
                      },
                    ]
                  : [
                      {
                        longValue: userRoleDict[1].label,
                        shortValue: userRoleDict[1].label,
                        selected: role === userRoleDict[1].value,
                        onClick: () => {
                          userMutation.mutate({
                            id: id,
                            role: userRoleDict[1].value,
                          });
                        },
                      },
                      {
                        longValue: userRoleDict[2].label,
                        shortValue: userRoleDict[2].label,
                        selected: role === userRoleDict[2].value,
                        onClick: () => {
                          userMutation.mutate({
                            id: id,
                            role: userRoleDict[2].value,
                          });
                        },
                      },
                      {
                        longValue: userRoleDict[3].label,
                        shortValue: userRoleDict[3].label,
                        selected: role === userRoleDict[3].value,
                        onClick: () => {
                          userMutation.mutate({
                            id: id,
                            role: userRoleDict[3].value,
                          });
                        },
                      },
                    ]
              }
            />
          );
        },
      },
      {
        Header: "Read Territories",
        id: "territories-read",
        Cell: ({ row }: CellType) => {
          const {
            id: userId,
            rights,
            territoryRights: territoryActants,
            role: userRole,
          } = row.original;

          const readTerritories = rights.filter(
            (r: IUserRight) => r.mode === "read"
          );

          return (
            <StyledTerritoryColumn>
              {userRole !== UserEnums.Role.Admin &&
              userRole !== UserEnums.Role.Owner ? (
                <React.Fragment>
                  <EntitySuggester
                    disableTemplatesAccept
                    disableCreate
                    onSelected={(newSelectedId: string) => {
                      addRightToUser(row.original, newSelectedId, "read");
                    }}
                    categoryTypes={[EntityEnums.Class.Territory]}
                    placeholder={"assign a territory"}
                    excludedActantIds={readTerritories.map((r) => r.territory)}
                  />
                  <StyledTerritoryList>
                    {readTerritories.length && territoryActants ? (
                      readTerritories.map((right: IUserRight) => {
                        const territoryActant = territoryActants.find(
                          (t) => t.territory.id === right.territory
                        );

                        return territoryActant && territoryActant.territory ? (
                          <StyledTerritoryListItem key={right.territory}>
                            <EntityTag
                              entity={territoryActant.territory}
                              unlinkButton={{
                                onClick: () => {
                                  removeRightFromUser(
                                    row.original,
                                    right.territory
                                  );
                                },
                                tooltipLabel: "remove territory from rights",
                              }}
                            />
                          </StyledTerritoryListItem>
                        ) : (
                          <StyledTerritoryListItemMissing key={right.territory}>
                            <div>invalid T {right.territory}</div>
                            <Button
                              key="d"
                              tooltipLabel="remove invalid territory"
                              icon={<FaTrashAlt />}
                              color="danger"
                              noBorder
                              onClick={() => {
                                removeRightFromUser(
                                  row.original,
                                  right.territory
                                );
                              }}
                            />
                          </StyledTerritoryListItemMissing>
                        );
                      })
                    ) : (
                      <div />
                    )}
                  </StyledTerritoryList>
                </React.Fragment>
              ) : (
                <StyledTerritoryColumnAllLabel>
                  all
                </StyledTerritoryColumnAllLabel>
              )}
            </StyledTerritoryColumn>
          );
        },
      },
      {
        Header: "Write Territories",
        id: "territories-write",
        Cell: ({ row }: CellType) => {
          const {
            id: userId,
            rights,
            territoryRights: territoryActants,
            role: userRole,
          } = row.original;

          const writeTerritories = rights.filter(
            (r: IUserRight) => r.mode === "write"
          );

          return (
            <StyledTerritoryColumn>
              {userRole !== UserEnums.Role.Admin &&
              userRole !== UserEnums.Role.Owner ? (
                userRole === UserEnums.Role.Editor ? (
                  <React.Fragment>
                    <EntitySuggester
                      disableTemplatesAccept
                      disableCreate
                      onSelected={(newSelectedId: string) => {
                        addRightToUser(row.original, newSelectedId, "write");
                      }}
                      categoryTypes={[EntityEnums.Class.Territory]}
                      placeholder={"assign a territory"}
                      excludedActantIds={writeTerritories.map(
                        (r) => r.territory
                      )}
                    />
                    <StyledTerritoryList>
                      {writeTerritories.length && territoryActants ? (
                        writeTerritories.map((right: IUserRight) => {
                          const territoryActant = territoryActants.find(
                            (t) => t.territory.id === right.territory
                          );

                          return territoryActant &&
                            territoryActant.territory ? (
                            <StyledTerritoryListItem key={right.territory}>
                              <EntityTag
                                entity={territoryActant.territory}
                                unlinkButton={{
                                  onClick: () => {
                                    removeRightFromUser(
                                      row.original,
                                      right.territory
                                    );
                                  },
                                  tooltipLabel: "remove territory from rights",
                                }}
                              />
                            </StyledTerritoryListItem>
                          ) : (
                            <StyledTerritoryListItemMissing
                              key={right.territory}
                            >
                              invalid T {right.territory}
                              <Button
                                key="d"
                                tooltipLabel="remove invalid territory"
                                icon={<FaTrashAlt />}
                                color="danger"
                                noBorder
                                onClick={() => {
                                  removeRightFromUser(
                                    row.original,
                                    right.territory
                                  );
                                }}
                              />
                            </StyledTerritoryListItemMissing>
                          );
                        })
                      ) : (
                        <div />
                      )}
                    </StyledTerritoryList>
                  </React.Fragment>
                ) : (
                  <StyledTerritoryColumnAllLabel>
                    -
                  </StyledTerritoryColumnAllLabel>
                )
              ) : (
                <StyledTerritoryColumnAllLabel>
                  all
                </StyledTerritoryColumnAllLabel>
              )}
            </StyledTerritoryColumn>
          );
        },
      },
      {
        Header: "",
        id: "actions",
        Cell: ({ row }: CellType) => {
          const {
            id: userId,
            rights,
            territoryRights: territoryActants,
            active,
            verified,
            role,
          } = row.original;

          let activateTooltip = "activate user";
          if (!verified) {
            activateTooltip = "cannot activate unverified user";
          } else if (userId === localStorage.getItem("userid")) {
            activateTooltip = "cannot deactivate yourself";
          } else if (role === UserEnums.Role.Owner) {
            activateTooltip = "owner must be active";
          } else if (active) {
            activateTooltip = "deactivate user";
          }

          let deleteTooltip = "delete user";
          if (userId === localStorage.getItem("userid")) {
            deleteTooltip = "cannot delete yourself";
          }

          return (
            <ButtonGroup $noMarginRight>
              <Button
                key="r"
                icon={<FaTrashAlt size={14} />}
                color="danger"
                tooltipLabel={deleteTooltip}
                disabled={
                  userId === localStorage.getItem("userid") ||
                  role === UserEnums.Role.Owner
                }
                onClick={() => {
                  setRemovingUserId(userId);
                }}
              />
              <Button
                icon={<FaKey size={14} />}
                tooltipLabel="reset password"
                color="warning"
                disabled={!active || !verified}
                onClick={() => {
                  resetPasswordMutation.mutate(userId);
                }}
              />
              <Button
                icon={
                  active ? <FaToggleOn size={14} /> : <FaToggleOff size={14} />
                }
                disabled={
                  !verified ||
                  userId === localStorage.getItem("userid") ||
                  role === UserEnums.Role.Owner
                }
                color={active ? "success" : "danger"}
                tooltipLabel={activateTooltip}
                onClick={() => {
                  userMutation.mutate({
                    id: userId,
                    active: !active,
                  });
                }}
              />
            </ButtonGroup>
          );
        },
      },
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    visibleColumns,
  } = useTable({
    columns,
    data: localUsers,
    getRowId,
  });

  return (
    <>
      <StyledTableWrapper>
        <StyledTable {...getTableProps()}>
          <StyledTHead>
            {headerGroups.map((headerGroup, key) => (
              <tr {...headerGroup.getHeaderGroupProps()} key={key}>
                {headerGroup.headers.map((column, key) => (
                  <StyledTh {...column.getHeaderProps()} key={key}>
                    {column.render("Header")}
                  </StyledTh>
                ))}
              </tr>
            ))}
          </StyledTHead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row: Row<IResponseUser>, i: number) => {
              prepareRow(row);
              return (
                <UserListTableRow index={i} row={row} {...row.getRowProps()} />
              );
            })}
          </tbody>
        </StyledTable>
        <Loader show={isFetching} />
      </StyledTableWrapper>

      {/* NEW USER | TEST EMAIL */}
      <UsersUtils users={localUsers} />

      <Submit
        title={`Deleting user ${removingUser ? removingUser.name : ""}`}
        text={`Do you really want to delete the user ${
          removingUser ? removingUser.name : ""
        }?`}
        show={removingUser != false}
        onSubmit={() => removingUser && removeUserMutation.mutate(removingUser)}
        onCancel={() => {
          setRemovingUserId(false);
        }}
        loading={removeUserMutation.isPending}
      />
    </>
  );
});
