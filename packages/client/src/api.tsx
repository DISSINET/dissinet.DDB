import { EntityEnums } from "@shared/enums";
import {
  EntityTooltip,
  IDocument,
  IEntity,
  IReference,
  IResponseAudit,
  IResponseBookmarkFolder,
  IResponseDetail,
  IResponseDocument,
  IResponseDocumentDetail,
  IResponseEntity,
  IResponseGeneric,
  IResponsePermission,
  IResponseStatement,
  IResponseTerritory,
  IResponseTree,
  IResponseUser,
  IStatement,
  ITerritory,
  IUser,
  Relation,
  RequestPermissionUpdate,
  IRequestStats,
  IAudit,
} from "@shared/types";
import { ISetting, ISettingGroup } from "@shared/types/settings";
import * as errors from "@shared/types/errors";
import { NetworkError } from "@shared/types/errors";
import { IRequestSearch } from "@shared/types/request-search";
import { defaultPing } from "Theme/constants";
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import React from "react";
import { toast } from "react-toastify";
import io, { Socket } from "socket.io-client";
import {
  EntitiesDeleteErrorResponse,
  EntitiesDeleteSuccessResponse,
  RelationsCreateErrorResponse,
  RelationsCreateSuccessResponse,
} from "types";

interface IApiOptions extends AxiosRequestConfig<any> {
  ignoreErrorToast: boolean;
}

type IFilterUsers = {
  label?: string;
};

type IFilterDocuments = {
  documentIds?: string[];
};

const parseJwt = (token: string) => {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
  try {
    return JSON.parse(jsonPayload);
  } catch {
    return false;
  }
};

class Api {
  private baseUrl: string;
  private apiUrl: string;
  private headers: object;
  private connection: AxiosInstance;
  // unique token key for each environment
  private tokenKey: string;
  private token: string;
  private ws?: Socket;
  private ping: number;

  private lastError: any = null;
  private errorTimeout: any;

  constructor() {
    this.baseUrl = process.env.APIURL || window.location.origin;
    this.apiUrl = this.baseUrl + "/api/v1";

    this.ping = defaultPing;

    this.headers = {
      "Content-Type": "application/json",
      //"Content-Encoding": "gzip",
    };

    this.connection = axios.create({
      baseURL: this.apiUrl,
      timeout: 8000,
      responseType: "json",
      headers: this.headers,
    });

    this.tokenKey = `${process.env.NODE_ENV}-token`;
    this.token = "";

    // TODO: remove after release - only needed once to clean up previous localStorage token usage
    localStorage.removeItem("token");
  }

  /**
   * Initializes websocket logic
   */
  initWs() {
    const url = new URL(this.baseUrl);

    this.ws = io(url.origin, {
      path: (url.pathname + "/socket.io").replace(`//`, "/"),
    });
    this.ws.on("connect", () => {
      console.log("Socket.IO connected");
    });
    this.ws.on("disconnect", () => {
      this.ping = -1;
      console.log("Socket.IO disconnected");
    });
    this.ws.on("error", (error) => {
      this.ping = -1;
      console.error("Socket error:", error);
    });
    this.ws.on("connect_error", (error) => {
      this.ping = -2;
      console.error("Socket connection error:", error);
    });
    this.ws.on("connect_timeout", () => {
      console.error("Socket connection timeout.");
    });

    setInterval(() => {
      const start = Date.now();

      (this.ws as Socket).emit("ping", (ack: any) => {
        if (ack instanceof Error) {
          console.error("Socket ping error:", ack);
        } else {
          const duration = Date.now() - start;
          this.ping = duration;
        }
      });
    }, 5000);
  }

  /**
   * Uses default request interceptors - mainly adding jwt token for requests
   */
  useDefaultRequestInterceptors() {
    // each request to api will be by default authorized
    this.connection.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${this.token}`;
      return config;
    });
  }

  /**
   * Uses default response interceptors - mainly checking for error and shows the toaster
   */
  useDefaultResponseInterceptors() {
    this.connection.interceptors.response.use(
      function (response) {
        // Any status code that lie within the range of 2xx cause this function to trigger
        // Do something with response data
        return response;
      },
      (error: AxiosError) => {
        //@ts-ignore
        if (!error.config?.ignoreErrorToast) {
          // Any status codes that falls outside the range of 2xx cause this function to trigger
          // Do something with response error
          if (this.shouldShowErrorToast(error)) {
            this.showErrorToast(error);
          }
        }

        if (error.status === 401) {
          // if handled by react router, then the toast could be visible
          window.location.pathname = (process.env.ROOT_URL || "") + "/login";
        }

        return Promise.reject(error);
      }
    );
  }

  shouldShowErrorToast(error: any) {
    if (this.lastError && this.lastError.message === error.message) {
      // Same error as the last one, don't show the toast
      return false;
    }

    // Update the last error to the current error
    this.lastError = error;

    // Clear the previous timeout if it exists
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }

    this.errorTimeout = setTimeout(() => {
      this.lastError = null;
    }, 600);

    return true;
  }

  getPing() {
    return this.ping;
  }

  handleError = (err: any | AxiosError) => {
    if (axios.isAxiosError(err)) {
      return err.response?.data || new NetworkError();
    } else {
      return new NetworkError();
    }
  };

  responseToError(responseData: unknown): errors.IErrorSignature {
    const out = {
      error: "",
      message: "",
    };

    if (
      responseData instanceof AxiosError &&
      (responseData as AxiosError).code === AxiosError.ERR_NETWORK
    ) {
      out.error = errors.NetworkError.name;
    } else if (
      responseData &&
      (responseData as any).response &&
      (responseData as any).response.data
    ) {
      out.error = (responseData as any).response.data.error;
      out.message = (responseData as any).response.data.message;
    }

    return out;
  }

  showErrorToast(err: any) {
    const hydratedError = errors.getErrorByCode(this.responseToError(err));

    // delay is necessary to resolve toast duplicities before firing the toast
    setTimeout(() => {
      toast.error(
        <div>
          {hydratedError.title}
          {hydratedError.message ? (
            <p style={{ fontSize: "1rem" }}>{hydratedError.message}</p>
          ) : null}
        </div>
      );
    }, 50);
  }

  isLoggedIn = () => {
    let storedToken = localStorage.getItem(this.tokenKey);
    let storedUsername = localStorage.getItem("username");
    return storedToken && storedUsername ? true : false;
  };

  /**
   * Authentication
   */
  checkLogin() {
    let storedToken = localStorage.getItem(this.tokenKey);
    let storedUsername = localStorage.getItem("username");
    let storedUserId = localStorage.getItem("userid");

    if (!!storedToken && !!storedUsername && !!storedUserId) {
      const parsedToken = parseJwt(storedToken);

      if (parsedToken && Date.now() < parsedToken.exp * 1000) {
        const username = parsedToken.user.name;
        const userrole = parsedToken.user.role;
        this.saveLogin(storedToken, username, storedUserId, userrole);
      } else {
        this.signOut();
      }
    }
  }

  saveLogin(
    newToken: string,
    newUserName: string,
    newUserId: string,
    newUserRole: string
  ) {
    localStorage.setItem(this.tokenKey, newToken);
    localStorage.setItem("username", newUserName);
    localStorage.setItem("userid", newUserId);
    localStorage.setItem("userrole", newUserRole);
    this.token = newToken;
  }

  /**
   * Clones the api wrapper with basic functionality without response interceptors
   * @returns Api
   */
  withoutToaster() {
    const newApi = new Api();
    newApi.token = this.token;
    newApi.useDefaultRequestInterceptors(); // required for login
    return newApi;
  }

  async signIn(
    login: string,
    password: string,
    options?: IApiOptions
  ): Promise<any> {
    try {
      const response = await this.connection.post(
        "/users/signin",
        {
          login,
          password,
        },
        options
      );

      if (response.status === 200) {
        const parsed = parseJwt(response.data.token);
        this.saveLogin(
          response.data.token,
          parsed.user.name,
          parsed.user.id,
          parsed.user.role
        );
        toast.success("Logged in");
      }
      return { ...response.data };
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async signOut() {
    localStorage.setItem(this.tokenKey, "");
    localStorage.setItem("username", "");

    this.token = "";
    // set global
  }

  /**
   * Users
   */

  async passwordChangeRequest(
    email: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(
        `/users/password_reset`,
        {
          email,
        },
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async passwordSetRequest(
    hash: string,
    password: string,
    passwordRepeat: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/users/password_reset?hash=${hash}`,
        {
          password,
          passwordRepeat,
        },
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async passwordResetExists(
    hash: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.get(
        `/users/password_reset?hash=${hash}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async usersGet(
    userId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseUser>> {
    try {
      const response = await this.connection.get(`/users/${userId}`, options);
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async usersGetMore(
    filters: IFilterUsers,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseUser[]>> {
    try {
      const response = await this.connection.get(
        `/users?label=${filters.label || ""}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async usersCreate(
    userData: {
      email: string;
    },
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(`/users`, userData, options);
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async usersUpdate(
    userId: string,
    changes: Partial<IUser>,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/users/${userId}`,
        changes,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async usersDelete(
    userId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.delete(
        `/users/${userId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /*
    This request will restart the password of the user with userId and send the new password to his email address
  */
  async resetPassword(
    userId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.patch(
        `/users/${userId}/password`,
        undefined,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /*
    This request will update the password of the user represented by userId
    Optionally use "me" as placeholder for the userId
  */
  async updatePassword(
    userId: string,
    password: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/users/${userId}`,
        {
          password,
        },
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /*
    Same request as resetPassword, just using currenly logged user for specyfing the target
  */
  async resetMyPassword(): Promise<AxiosResponse<IResponseGeneric>> {
    return this.resetPassword("me");
  }

  /*
    This request will attempt to send test email to current user's email address
  */
  async testEmail(testEmail: string): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.get(
        `/users/me/emails/test?email=${testEmail}`
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Bookmarks
   * Bookmarks container
   */
  async bookmarksGet(
    userId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseBookmarkFolder[]>> {
    try {
      const response = await this.connection.get(
        `/users/${userId}/bookmarks`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Entities
   * Suggester container
   */
  async entitiesGet(
    entityId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseEntity>> {
    try {
      const response = await this.connection.get(
        `/entities/${entityId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async entitiesSearch(
    filter: IRequestSearch,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseEntity[]>> {
    try {
      if (!filter.class) {
        delete filter.class;
      }
      const response = await this.connection.get(`/entities`, {
        ...options,
        params: filter,
      });
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async entityCreate(
    newEntityData: IEntity | IStatement | ITerritory,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(
        `/entities`,
        newEntityData,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async entityClone(
    originalId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(
        `/entities/${originalId}/clone`,
        undefined,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async entityUpdate(
    entityId: string,
    changes: Partial<IEntity>,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/entities/${entityId}`,
        changes,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async entityDelete(
    entityId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.delete(
        `/entities/${entityId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async entitiesDelete(
    entityIds: string[],
    options?: IApiOptions
  ): Promise<(EntitiesDeleteSuccessResponse | EntitiesDeleteErrorResponse)[]> {
    const out: (EntitiesDeleteSuccessResponse | EntitiesDeleteErrorResponse)[] =
      [];
    try {
      const response = await this.connection.delete(`/entities/`, {
        data: {
          entityIds,
        },
        ...options,
      });
      const data = (
        response.data as IResponseGeneric<
          Record<string, errors.CustomError | true>
        >
      ).data;
      if (data) {
        for (const errorEntityId of Object.keys(data)) {
          if (data[errorEntityId] === true) {
            out.push({ entityId: errorEntityId, details: data[errorEntityId] });
          } else {
            out.push({
              entityId: errorEntityId,
              error: true,
              details: data[errorEntityId],
            });
          }
        }
      }
    } catch (err) {
      for (const entityId of entityIds) {
        out.push({
          error: true,
          message: `Failed to delete entity ${entityId}`,
          entityId: entityId,
          details: this.handleError(err),
        });
      }
    }

    return out;
  }

  async entityRestore(
    entityId: string
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(
        `/entities/${entityId}/restore`
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Detail
   * Detail container
   */
  async detailGet(
    entityId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseDetail>> {
    try {
      const response = await this.connection.get(
        `/entities/${entityId}/detail`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Tree
   * Tree container
   */
  async treeGet(options?: IApiOptions): Promise<AxiosResponse<IResponseTree>> {
    try {
      const response = await this.connection.get(`/tree`, options);
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  // this may include parent change
  async treeMoveTerritory(
    moveId: string,
    parentId: string,
    newIndex: number,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.patch(
        `/tree/${moveId}/position`,
        {
          parentId,
          newIndex,
        },
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Territory
   * List container
   */
  async territoryGet(
    territoryId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseTerritory>> {
    try {
      const response = await this.connection.get(
        `/territories/${territoryId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * entityIdsInTerritory retieves ids of statements that are used on the territory
   * @see Statement.findDependentStatementIds
   */
  async entityIdsInTerritory(
    territoryId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<string[]>> {
    try {
      const response = await this.connection.get(
        `/territories/${territoryId}/entities`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async territoriesCopy(
    territoryId: string,
    targets: string[],
    withChildren: boolean,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(
        `/territories/${territoryId}/copy`,
        {
          targets,
          withChildren,
        },
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Tooltips
   */

  async tooltipGet(
    entityId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<EntityTooltip.IResponse>> {
    try {
      const response = await this.connection.get(
        `/entities/${entityId}/tooltip`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Stats
   */
  async statsGet(
    data: IRequestStats,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseAudit>> {
    try {
      const response = await this.connection.post(`/stats`, data, options);
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Audit
   */
  async auditGet(
    entityId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseAudit>> {
    try {
      const response = await this.connection.get(
        `/entities/${entityId}/audits`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async auditGetFirst(
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric<IAudit>>> {
    try {
      const response = await this.connection.get(
        `/audits?skip=0&take=1&from=1970`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Statement
   * Editor container
   */
  async statementGet(
    statementId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseStatement>> {
    try {
      const response = await this.connection.get(
        `/statements/${statementId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async statementsBatchMove(
    statementsIds: string[],
    territoryId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/statements/batch-move?ids=${statementsIds.join(",")}`,
        {
          territoryId,
        },
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async statementsBatchCopy(
    statementsIds: string[],
    territoryId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(
        `/statements/batch-copy?ids=${statementsIds.join(",")}`,
        {
          territoryId,
        },
        options
      );
      // response.data.data should have list of new ids
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async statementsReferencesReplace(
    statementsIds: string[],
    references: IReference[],
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/statements/references?ids=${statementsIds.join(",")}&replace=true`,
        references,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async statementsReferencesAppend(
    statementsIds: string[],
    references: IReference[],
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/statements/references?ids=${statementsIds.join(",")}`,
        references,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Pernmissions
   */

  async getAclPermissions(
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponsePermission[]>> {
    try {
      const response = await this.connection.get(`/acls`, options);
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async updatePermission(
    permissionId: string,
    data: RequestPermissionUpdate,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/acls/${permissionId}`,
        data,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async activation(
    hash: string,
    password: string,
    passwordRepeat: string,
    username: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(
        `/users/activation?hash=${hash}`,
        {
          password,
          passwordRepeat,
          username,
        },
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async activationExists(
    hash: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.get(
        `/users/activation?hash=${hash}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Relations
   */
  async relationUpdate(
    relationId: string,
    changes: Partial<Relation.IRelation>,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/relations/${relationId}`,
        changes,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async relationCreate(
    newRelation: Relation.IRelation,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.post(
        `/relations`,
        newRelation,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async relationsCreate(
    newRelations: Relation.IRelation[],
    options?: IApiOptions
  ): Promise<
    (RelationsCreateSuccessResponse | RelationsCreateErrorResponse)[]
  > {
    const out = [];

    for (const newRelation of newRelations) {
      try {
        const response = await this.connection.post(
          `/relations`,
          newRelation,
          options
        );
        out.push({ relation: newRelation, details: response });
      } catch (err) {
        out.push({
          error: true,
          message: `Failed to create relation ${newRelation.id}`,
          relation: newRelation,
          details: this.handleError(err),
        });
      }
    }

    return out;
  }

  async relationDelete(
    relationId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.delete(
        `/relations/${relationId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Document
   */

  async documentsGet(
    filter: IFilterDocuments,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseDocument[]>> {
    try {
      const response = await this.connection.get(`/documents/`, {
        ...options,
        params: filter,
      });
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async documentGet(
    documentId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseDocumentDetail>> {
    try {
      const response = await this.connection.get(
        `/documents/${documentId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async documentDelete(
    documentId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IDocument>> {
    try {
      const response = await this.connection.delete(
        `/documents/${documentId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Document
   */
  async documentUpload(
    document: Partial<IDocument>,
    options?: IApiOptions
  ): Promise<AxiosResponse<IDocument>> {
    try {
      const response = await this.connection.post(
        `/documents`,
        document,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async documentExport(
    documentId: string,
    exportedEntities: EntityEnums.Class[]
  ): Promise<any> {
    try {
      const response = await this.connection.post(
        `/documents/export`,
        {
          documentId,
          exportedEntities,
        },
        { responseType: "blob" }
      );

      let fileName = `${documentId}-`;
      if (Object.keys(EntityEnums.Class).length === exportedEntities.length) {
        fileName += "all_anchors";
      } else if (exportedEntities.length > 0) {
        fileName += exportedEntities.join("");
      } else {
        fileName += "no_anchors";
      }

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");

      a.href = url;
      a.download = `${fileName}.txt`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async documentRemoveAnchors(
    documentId: string,
    entityId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.patch(
        `/documents/${documentId}/removeAnchors?entityId=${entityId}`,
        undefined,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async documentRemoveAnchor(
    documentId: string,
    entityId: string,
    anchorText: string,
    anchorIndex: number,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.patch(
        `/documents/${documentId}/removeAnchor`,
        {
          entityId,
          anchorText,
          anchorIndex,
        },
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Document update
   */
  async documentUpdate(
    documentId: string,
    document: Partial<IDocument>,
    options?: IApiOptions
  ): Promise<AxiosResponse<IDocument>> {
    try {
      const response = await this.connection.put(
        `/documents/${documentId}`,
        document,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Setting get
   * @param settingId
   * @param options
   * @returns
   */
  async settingGet(
    settingId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric<ISetting>>> {
    try {
      const response = await this.connection.get(
        `/settings/${settingId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Setting group get
   * @param settingId
   * @param options
   * @returns
   */
  async settingGroupGet(
    settingGroupId: string,
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric<ISettingGroup>>> {
    try {
      const response = await this.connection.get(
        `/settings/group/${settingGroupId}`,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Setting group get
   * @param settingId
   * @param data
   * @param options
   * @returns
   */
  async settingGroupUpdate(
    settingGroupId: string,
    data: { id: string; value: unknown }[],
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric<ISettingGroup>>> {
    try {
      const response = await this.connection.put(
        `/settings/group/${settingGroupId}`,
        data,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Setting update
   * @param settingId
   * @param data
   * @param options
   * @returns
   */
  async settingUpdate(
    settingId: string,
    data: { value: unknown },
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric>> {
    try {
      const response = await this.connection.put(
        `/settings/${settingId}`,
        data,
        options
      );
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Get owner's info
   * @param settingId
   * @param options
   * @returns
   */
  async usersGetOwner(
    options?: IApiOptions
  ): Promise<AxiosResponse<IResponseGeneric<string>>> {
    try {
      const response = await this.connection.get(`/users/owner`, options);
      return response;
    } catch (err) {
      throw this.handleError(err);
    }
  }
}

const apiSingleton = new Api();
apiSingleton.initWs();
apiSingleton.checkLogin();
apiSingleton.useDefaultRequestInterceptors();
apiSingleton.useDefaultResponseInterceptors();

export default apiSingleton;
