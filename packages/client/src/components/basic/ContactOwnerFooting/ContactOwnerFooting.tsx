import React from "react";
import { StyledContactOwner } from "./ContactOwnerFootingStyles";
import api from "api";
import { useQuery } from "@tanstack/react-query";

// TODO: can be deleted as we don't use it right now
interface ContactOwnerFooting {}
export const ContactOwnerFooting: React.FC<ContactOwnerFooting> = ({}) => {
  const { data: ownerMail } = useQuery({
    queryKey: ["owner"],
    queryFn: async () => {
      const res = await api.usersGetOwner({ ignoreErrorToast: true });
      return res.data.data;
    },
  });

  return (
    <>
      {ownerMail && (
        <StyledContactOwner>
          {`In case of any problems, please contact`}
          <br />
          {`the project owner at ${ownerMail}`}
        </StyledContactOwner>
      )}
    </>
  );
};
