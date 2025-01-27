import React from "react";
import { StyledContactAdmin } from "./ContactAdminFootingStyles";

interface ContactAdminFooting {}
export const ContactAdminFooting: React.FC<ContactAdminFooting> = ({}) => {
  const adminMail = process.env.ADMIN_MAIL;
  return (
    <>
      {adminMail && (
        <StyledContactAdmin>
          {`In case of any problems, please contact`}
          <br />
          {`the administrator at ${adminMail}`}
        </StyledContactAdmin>
      )}
    </>
  );
};
