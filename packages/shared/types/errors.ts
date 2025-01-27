/**
 * CustomError is wrapper around generic Error object/interface, so we can implement our own logic and still use classic Error approach.
 * The changes are:
 *   - statusCode method returns static 'code' attribute from constructed class
 *   - loggable/shouldLog predicate tells the middleware if this error is significant and should be logged
 *   - title attribute is derived from the constructor attribute (static prop). Provides basic title in readable form
 */
export class CustomError extends Error {
  public static code: number = 400; // html code
  public loggable: boolean = false; // errors could be logged into console as warn messages
  public log: string = ""; // same as first constructor argument - wont be thrown as API response, but it will be printed as warning
  public title: string = ""; // represents the error class in readable form
  public data: any; // arbitrary data

  // the following is commented, it should be inherited from base Error
  //public name: string = ""; // Stands for class name, replaces default 'Error' string from parent constructor
  //public message: string = ""; // this is what will be printed in output - public text, some error classes have overriden message attr

  constructor(message?: string, loggableMessage?: string) {
    super(message);
    this.name = this.constructor.name; // so the value would be taken from the constructor - not the default Error
    this.title = (this.constructor as any).title;
    if (!message) {
      this.message = (this.constructor as any).message;
    }
    this.log = loggableMessage || message || "";
  }

  statusCode(): number {
    return (this.constructor as any).code;
  }

  shouldLog(): boolean {
    return this.loggable;
  }

  withData(data: any): CustomError {
    this.data = data;
    return this;
  }
}

/**
 * BadCredentialsError is an error associated with invalid combination of login & password credentials
 */
class TooManyRequestsError extends CustomError {
  public static code = 429;
  public static title = "Too many requests";
  public static message = "Try again in a few minutes";
}

/**
 * BadCredentialsError is an error associated with invalid combination of login & password credentials
 */
class BadCredentialsError extends CustomError {
  public static code = 401;
  public static title = "Bad credentials";
  public static message = "";
}

/**
 * PermissionDeniedError will be thrown if request is not authorized to request such resource
 */
class PermissionDeniedError extends CustomError {
  public static code = 403;
  public static title = "Permission denied";
  public static message = "You don't have required permissions";
}

/**
 * ModelNotValidError is thrown, when incoming raw data in the api handler cannot be assigned to known model.
 * Governed by 'class' attribute
 * @see ../../packages/server/models/factory.ts
 */
class ModelNotValidError extends CustomError {
  public static code = 400;
  public static title = "Model not valid";
  public static message = "Invalid request data";
}

/**
 * NotFound will be thrown when the api cannot handle the request - unknown route
 */
class NotFound extends CustomError {
  public static code = 404;
  public static title = "Not found";
  public static message = "Endpoint not implemented";
}

/**
 * BadParams is more generic error for bad input data
 */
class BadParams extends CustomError {
  public static code = 400;
  public static title = "Bad parameters";
  public static message = "Invalid request data";
}

/**
 * UserDoesNotExits will be thrown when attempting to remove/update the user entry, which does not exist
 */
class UserDoesNotExits extends CustomError {
  public static code = 400;
  public static title = "Missing user";
  public static message = "User $1 does not exist";

  constructor(m: string, userId: string) {
    super(m);
    this.message = this.message.replace("$1", userId);
  }
}

/**
 * UserAlreadyActivated will be thrown when attempting to activate user, that has been already activated or the hash which governs the activation does not exist
 */
class UserAlreadyActivated extends CustomError {
  public static code = 400;
  public static title = "User already activated user";
  public static message = "User already activated or activation link expired";
}

/**
 * UserBadActivationHash will be thrown if searching for invalid activation hash
 */
class UserBadActivationHash extends CustomError {
  public static code = 400;
  public static title = "Invalid activation hash";
  public static message =
    "User activation unsuccessful. Please verify the validity of the activation link and try again. If the problem persists, contact our support team for assistance.";
}

/**
 * UserNotActiveError
 */
class UserNotActiveError extends CustomError {
  public static code = 403;
  public static title = "Inactive user";
  public static message = "User $1 is not active";
  public static messageVerified = "User $1 is not verified";

  constructor(m: string, userId: string) {
    super(m);
    this.message = this.message.replace("$1", userId);
  }
}

/**
 * UserNotUnique will be thrown when attempting to add/update the user entry to login, which is already in the db
 */
class UserNotUnique extends CustomError {
  public static code = 409;
  public static title = "User with this login already exists";
  public static message = "Either email or username is already used";
}

/**
 * EntityDoesNotExist will be thrown when attempting to remove/update the entity entry, which does not exist
 */
class EntityDoesNotExist extends CustomError {
  public static code = 400;
  public static title = "Missing entity";
  public static message = "Entity $1 does not exist";

  constructor(m: string, entityId?: string) {
    super(m);
    if (entityId) {
      this.message = this.message.replace("$1", entityId);
    } else {
      this.message = this.message.replace(" $1 ", " ");
    }
  }
}

/**
 * EntityDoesExist will be thrown when attempting to restore the entity entry, which still does exist
 */
class EntityDoesExist extends CustomError {
  public static code = 400;
  public static title = "Entity still exists";
  public static message = "Entity $1 does exist";

  constructor(m: string, entityId?: string) {
    super(m);
    if (entityId) {
      this.message = this.message.replace("$1", entityId);
    } else {
      this.message = this.message.replace(" $1 ", " ");
    }
  }
}

/**
 * AuditDoesNotExist will be thrown when attempting to retrieve entry by id, which does not exist
 */
class AuditDoesNotExist extends CustomError {
  public static code = 400;
  public static title = "Missing audit";
  public static message = "Audit $1 does not exist";

  constructor(m: string, entityId?: string) {
    super(m);
    if (entityId) {
      this.message = this.message.replace("$1", entityId);
    } else {
      this.message = this.message.replace(" $1 ", " ");
    }
  }
}

/**
 * AuditsDoNotExist will be thrown when attempting to access audits entries, which do not exist
 */
class AuditsDoNotExist extends CustomError {
  public static code = 400;
  public static title = "Missing audits";
  public static message = "Audits for entity $1 do not exist";

  constructor(m: string, entityId: string) {
    super(m);
    this.message = this.message.replace("$1", entityId);
  }
}

/**
 * StatementDoesNotExits will be thrown when attempting to remove/update the statement entry, which does not exist
 */
class StatementDoesNotExits extends CustomError {
  public static code = 400;
  public static title = "Missing statement";
  public static message = "Statement $1 does not exist";

  constructor(m: string, statementId: string) {
    super(m);
    this.message = this.message.replace("$1", statementId);
  }
}

/**
 * TerritoryDoesNotExits will be thrown when attempting to remove/update the territory entry, which does not exist
 */
class TerritoryDoesNotExits extends CustomError {
  public static code = 400;
  public static title = "Missing territory";
  public static message = "Territory $1 does not exist";

  constructor(m: string, territoryId: string) {
    super(m);
    this.message = this.message.replace("$1", territoryId);
  }
}

/**
 * PermissionDoesNotExits will be thrown when attempting to remove/update the permission entry which does not exist
 */
class PermissionDoesNotExits extends CustomError {
  public static code = 400;
  public static title = "Permission does not exist";
  public static message = "Permission $1 does not exist";

  constructor(m: string, permissionId: string) {
    super(m);
    this.message = this.message.replace("$1", permissionId);
  }
}

/**
 * TerritoriesBrokenError is an error associated with broken tree structure (more than one root element)
 */
class TerritoriesBrokenError extends CustomError {
  public static code = 500;
  public static title = "Territories broken";
  public static message = "Territories are broken";
}

/**
 * TerrytoryInvalidMove will be thrown during tree/id/position request, while violating some constraint
 */
class TerrytoryInvalidMove extends CustomError {
  public static code = 500;
  public static title = "Territory invalid move";
  public static message = "Move action cannot be completed";
}

/**
 * StatementInvalidMove will be thrown during territories/moveStatement request, while violating some constraint
 */
class StatementInvalidMove extends CustomError {
  public static code = 500;
  public static title = "Statement invalid move";
  public static message = "Move action cannot be completed";
}

/**
 * InternalServerError will be thrown when some unexpected error occurs
 */
class InternalServerError extends CustomError {
  public static code = 500;
  public static title = "Internal server error";
  public static message = "An unknown error occured";
  loggable = true;
}

/**
 * UnauthorizedError will be thrown during request, which does not contain authorization data (without jwt token)
 */
class UnauthorizedError extends CustomError {
  public static code = 401;
  public static title = "Unauthorized";
  public static message = "Unauthorized request";
}

/**
 * InvalidDeleteError will be thrown from model's delete method, while violating some constraint
 */
class InvalidDeleteError extends CustomError {
  public static code = 400;
  public static title = "Invalid delete";
  public static message = "Model cannot be deleted";
  loggable = true;
}

/**
 * EmailError will be thrown in case of error occured in mail module
 */
class EmailError extends CustomError {
  public static code = 500;
  public static title = "Email cannot be sent";
  public static message = "Unknow error while sending the email";
  loggable = true;

  constructor(m: string, internalMessage: string) {
    super(m);
    this.log = internalMessage;
  }
}

/**
 * RelationDoesNotExist will be thrown when attempting to remove/update the relation entry, which does not exist
 */
class RelationDoesNotExist extends CustomError {
  public static code = 400;
  public static title = "Cannot get Relation entry";
  public static message = "Relation $1 does not exist";

  static forId(id: string): RelationDoesNotExist {
    return new RelationDoesNotExist(
      RelationDoesNotExist.message.replace("$1", id)
    );
  }
}

/**
 * RelationAsymetricalPathExist will be thrown when attempting to add asymetrical relation while there could already be path from A -> B
 */
class RelationAsymetricalPathExist extends CustomError {
  public static code = 400;
  public static title = "Relation not created";
  public static message = "Asymetrical constraint check failed";

  static forId(id: string): RelationAsymetricalPathExist {
    return new RelationAsymetricalPathExist(
      RelationAsymetricalPathExist.message.replace("$1", id)
    );
  }
}

/**
 * DocumentDoesNotExist will be thrown when attempting to retrieve document by id, which does not exist
 */
class DocumentDoesNotExist extends CustomError {
  public static code = 400;
  public static title = "Cannot get Document entry";
  public static message = "Document $1 does not exist";

  static forId(id: string): DocumentDoesNotExist {
    return new DocumentDoesNotExist(
      DocumentDoesNotExist.message.replace("$1", id)
    );
  }
}

/**
 * Will be thrown when passwords is not safe
 */
class UnsafePasswordError extends CustomError {
  public static code = 400;
  public static title = "Unsafe password";
  public static message = "The entered password is not safe.";
}

/**
 * Will be thrown when passwords don't match
 */
class PasswordDoesNotMatchError extends CustomError {
  public static code = 400;
  public static title = "Unsafe password";
  public static message = "Passwords do not match.";
}

/**
 * Will be thrown when activation is unsuccessful due to invalid hash
 */
class ActivationHashInvalidError extends CustomError {
  public static code = 400;
  public static title = "Invalid hash";
  public static message =
    "User activation unsuccessful. Please verify the validity of the actionation link and try again. If the problem persists, contact our support team for assistance.";
}

/**
 * Will be thrown when password reset is unsuccessful due to invalid hash
 */
class PasswordResetHashError extends CustomError {
  public static code = 400;
  public static title = "Invalid link";
  public static message =
    "Password reset unsuccessful. Please verify the validity of the recovery link and try again. If the problem persists, contact our support team for assistance.";
}

/**
 * Will be thrown when username is too short
 */
class UsernameTooShortError extends CustomError {
  public static code = 400;
  public static title = "Username too short";
  public static message = "Username is too short. Please select a new one.";
}

/**
 * Will be thrown when username is too short
 */
class UsernameTooLongError extends CustomError {
  public static code = 400;
  public static title = "Username too long";
  public static message = "Username is too long. Please select a new one.";
}

/**
 * Will be thrown when username is too short
 */
class InvalidEmailError extends CustomError {
  public static code = 400;
  public static title = "Invalid email";
  public static message = "Invalid email entered";
}

/**
 * UnknownError works as a backup
 */
class UnknownError extends CustomError {
  public static code = 500;
  public static title = "Unknown error";
  public static message = "Mysterious";
}

class NetworkError extends CustomError {
  public static code = 500;
  public static title = "Connection to server lost";
  public static message =
    "Please check your network connection. Otherwise contact the project owner.";
}

const allErrors: Record<string, any> = {
  InvalidDeleteError,
  UnauthorizedError,
  PermissionDeniedError,
  InternalServerError,
  ModelNotValidError,
  BadCredentialsError,
  NotFound,
  BadParams,
  UserDoesNotExits,
  UserAlreadyActivated,
  UserBadActivationHash,
  UserNotUnique,
  UserNotActiveError,
  EntityDoesNotExist,
  EntityDoesExist,
  AuditDoesNotExist,
  AuditsDoNotExist,
  StatementDoesNotExits,
  PermissionDoesNotExits,
  TerritoriesBrokenError,
  TerritoryDoesNotExits,
  TerrytoryInvalidMove,
  StatementInvalidMove,
  EmailError,
  RelationDoesNotExist,
  RelationAsymetricalPathExist,
  DocumentDoesNotExist,
  NetworkError,
  UnsafePasswordError,
  PasswordDoesNotMatchError,
  PasswordResetHashError,
  ActivationHashInvalidError,
  UsernameTooShortError,
  UsernameTooLongError,
  InvalidEmailError,
  TooManyRequestsError,
};

export interface IErrorSignature {
  error: string; // unique error code - error's constructor
  message: string; // additional message in readable form
}

export function getErrorByCode(errSig: IErrorSignature): CustomError {
  return allErrors[errSig.error]
    ? new allErrors[errSig.error](errSig.message)
    : new UnknownError(errSig.message || "Unknown error occured");
}

export {
  InvalidDeleteError,
  UnauthorizedError,
  PermissionDeniedError,
  InternalServerError,
  ModelNotValidError,
  BadCredentialsError,
  NotFound,
  BadParams,
  UserDoesNotExits,
  UserAlreadyActivated,
  UserBadActivationHash,
  UserNotUnique,
  UserNotActiveError,
  EntityDoesNotExist,
  EntityDoesExist,
  AuditDoesNotExist,
  AuditsDoNotExist,
  StatementDoesNotExits,
  PermissionDoesNotExits,
  TerritoriesBrokenError,
  TerritoryDoesNotExits,
  TerrytoryInvalidMove,
  StatementInvalidMove,
  EmailError,
  RelationDoesNotExist,
  RelationAsymetricalPathExist,
  DocumentDoesNotExist,
  NetworkError,
  UnsafePasswordError,
  PasswordDoesNotMatchError,
  PasswordResetHashError,
  ActivationHashInvalidError,
  UsernameTooShortError,
  UsernameTooLongError,
  InvalidEmailError,
  TooManyRequestsError,
};
