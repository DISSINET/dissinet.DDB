import { userRoleDict } from "@shared/dictionaries";
import { HttpMethods, UserEnums } from "@shared/enums";
import { IResponsePermission, RequestPermissionUpdate } from "@shared/types";
import api from "api";
import { Box } from "components";
import { Page } from "components/advanced";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface AclPage {}

const initialData: IResponsePermission[] = [
  {
    id: "",
    controller: "",
    route: "",
    method: HttpMethods.Get, // Assuming a default method for demonstration
    roles: [],
    public: false,
  },
];

const AclPage: React.FC<AclPage> = ({}) => {
  const [currentCtrlName, setCtrl] = useState("");
  const [currentMethod, setMethod] = useState("");

  const {
    status,
    data = initialData,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await api.getAclPermissions();
      return res.data;
    },
  });

  const handleSave = async (
    permissionId: string,
    data: RequestPermissionUpdate
  ) => {
    await api.updatePermission(permissionId, data);
  };

  const ctrls = data
    ? (data as IResponsePermission[]).reduce<
        Record<string, Record<string, IResponsePermission>>
      >((acc, current) => {
        if (!acc[current.controller]) {
          acc[current.controller] = {};
        }

        acc[current.controller][current.route] = current;
        return acc;
      }, {})
    : {};

  return (
    <>
      {Object.keys(ctrls).map((ctrlName) => (
        <div
          key={ctrlName}
          style={{
            backgroundColor:
              ctrlName == currentCtrlName ? "#ccc" : "transparent",
          }}
          onClick={() => setCtrl(ctrlName)}
        >
          {ctrlName}
        </div>
      ))}
      {currentCtrlName && (
        <Box>
          {Object.keys(ctrls[currentCtrlName]).map((method) => (
            <div
              key={method}
              style={{
                backgroundColor:
                  method == currentMethod ? "#ccc" : "transparent",
              }}
              onClick={() => setMethod(method)}
            >
              {method}
            </div>
          ))}
          <hr />
          {currentMethod && ctrls[currentCtrlName][currentMethod] && (
            <div>
              Roles:{" "}
              <select
                onChange={(e) =>
                  handleSave(ctrls[currentCtrlName][currentMethod].id, {
                    roles: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value as UserEnums.Role
                    ),
                  })
                }
                multiple={true}
              >
                {userRoleDict.map((role) => (
                  <option
                    key={role.label}
                    selected={
                      ctrls[currentCtrlName][currentMethod].roles.indexOf(
                        role.label
                      ) !== -1
                    }
                    value={role.label}
                  >
                    {role.label}
                  </option>
                ))}
                <option
                  selected={
                    ctrls[currentCtrlName][currentMethod].roles.indexOf("*") !==
                    -1
                  }
                  value="*"
                >
                  all
                </option>
              </select>
              <button>save</button>
            </div>
          )}
        </Box>
      )}
    </>
  );
};

export default AclPage;
