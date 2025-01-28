import React from "react";
import { StyledContactOwner } from "./ContactOwnerFootingStyles";
import api from "api";
import { useQuery } from "@tanstack/react-query";

interface ContactOwnerFooting {}
export const ContactOwnerFooting: React.FC<ContactOwnerFooting> = ({}) => {
  const { data: ownerMail } = useQuery({
    queryKey: ["owner"],
    queryFn: async () => {
      const res = await api.usersGetOwner();
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
