import { Router } from "express";
import { IUser } from "@shared/types/user";
import User from "@models/user/user";
import {
  BadCredentialsError,
  BadParams,
  EmailError,
  InternalServerError,
  ModelNotValidError,
  PermissionDeniedError,
  UserDoesNotExits,
  UserNotActiveError,
  UserNotUnique,
} from "@shared/types/errors";
import { checkPassword, generateAccessToken, hashPassword } from "@common/auth";
import { asyncRouteHandler } from "..";
import {
  IResponseBookmarkFolder,
  IResponseUser,
  IResponseGeneric,
  IRequestPasswordReset,
  IRequestPasswordResetData,
  IRequestActivationData,
} from "@shared/types";
import mailer, {
  accountCreatedTemplate,
  passwordAdminResetTemplate,
  passwordResetRequestTemplate,
  testTemplate,
} from "@service/mailer";
import { ResponseUser } from "@models/user/response";
import { IRequest } from "src/custom_typings/request";

export default Router()
  /**
   * @openapi
   * /users/password_reset:
   *   post:
   *     description: Creates new hash-based password reset for user specified by email
   *     tags:
   *       - users
   *     requestBody:
   *       description: User object
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/IUser"
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .post(
    "/password_reset",
    asyncRouteHandler<IResponseGeneric>(
      async (request: IRequest<any, IRequestPasswordReset, any>) => {
        const email = request.body.email;
        if (!email) {
          throw new BadParams("email has to be set");
        }

        const user = await User.getUserByEmail(request.db.connection, email);
        if (!user) {
          throw new UserDoesNotExits("user does not exist", "");
        }

        user.generateHash();

        await user.update(request.db.connection, { hash: user.hash });

        try {
          await mailer.sendTemplate(
            email,
            passwordResetRequestTemplate(
              user.email,
              `/password_reset?hash=${user.hash}&email=${user.email}`
            )
          );
        } catch (e) {
          throw new EmailError(
            "please check the logs",
            (e as Error).toString()
          );
        }

        return {
          result: true,
          message: `Please check your email ${email} to continue with password reset`,
        };
      }
    )
  )
  .put(
    "/password_reset",
    asyncRouteHandler<IResponseGeneric>(
      async (request: IRequest<any, IRequestPasswordResetData, any>) => {
        const hash = request.query.hash;
        const password = request.body.password;
        const passwordRepeat = request.body.passwordRepeat;

        if (!hash) {
          throw new BadParams("hash is required");
        }

        if (!password || password !== passwordRepeat) {
          throw new BadParams("mismatched or empty passwords");
        }

        const user = await User.getUserByHash(request.db.connection, hash);
        if (!user) {
          throw new UserDoesNotExits("user for provided hash not found", "");
        }

        user.setPassword(password);
        await user.update(request.db.connection, { password: user.password });

        return {
          result: true,
          message: "Your password has been reset",
        };
      }
    )
  )
  /**
   * @openapi
   * /users/signin:
   *   post:
   *     description: Attempts to signin
   *     tags:
   *       - users
   *     requestBody:
   *       description: Login credentials
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   */
  .post(
    "/signin",
    asyncRouteHandler<unknown>(async (request: IRequest) => {
      const login = request.body.login;
      const rawPassword = request.body.password;

      if (!login || !rawPassword) {
        throw new BadParams("login and password have to be set");
      }

      const user = await User.findUserByLogin(request.db, login);
      if (!user) {
        throw new UserDoesNotExits(`user ${name} was not found`, login);
      }

      if (!user.active) {
        throw new UserNotActiveError(UserNotActiveError.message, user.email);
      }

      if (!checkPassword(rawPassword, user.password || "")) {
        throw new BadCredentialsError("unknown credentials");
      }

      return {
        token: generateAccessToken(user),
      };
    })
  )
  /**
   * @openapi
   * /users/me:
   *   get:
   *     description: Returns user detail for current user
   *     tags:
   *       - users
   *     responses:
   *       200:
   *         description: Returns IResponseUser object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseUser"
   */
  .get(
    "/me",
    asyncRouteHandler<IResponseUser>(async (request: IRequest) => {
      const user = request.getUserOrFail();
      const response = new ResponseUser(user);
      await response.unwindAll(request);

      return response;
    })
  )
  /**
   * @openapi
   * /users/{userId}:
   *   get:
   *     description: Returns user entry
   *     tags:
   *       - users
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the user entry
   *     responses:
   *       200:
   *         description: Returns IResponseUser object
   *         content:
   *           application/json:
   *             schema:
   *                 $ref: "#/components/schemas/IResponseUser"
   */
  .get(
    "/:userId",
    asyncRouteHandler<IResponseUser>(async (request: IRequest) => {
      const userId = request.params.userId;

      if (!userId) {
        throw new BadParams("userId has to be set");
      }

      const user = await User.findUserById(request.db.connection, userId);
      if (!user) {
        throw new UserDoesNotExits(`user ${userId} was not found`, userId);
      }

      const response = new ResponseUser(user);
      await response.unwindAll(request);

      return response;
    })
  )
  /**
   * @openapi
   * /users:
   *   get:
   *     description: Returns list of user entries
   *     tags:
   *       - users
   *     parameters:
   *       - in: query
   *         name: label
   *         schema:
   *           type: string
   *         required: true
   *         description: label filter
   *     responses:
   *       200:
   *         description: Returns list of IUser objects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: "#/components/schemas/IUser"
   */
  .get(
    "/",
    asyncRouteHandler<IResponseUser[]>(async (request: IRequest) => {
      const label = (request.query.label as string) || "";

      let userModels: User[];
      if (!label) {
        userModels = await User.findAllUsers(request.db.connection);
      } else if (label.length < 2) {
        return [];
      } else {
        userModels = await User.findUsersByLabel(request.db.connection, label);
      }

      const out: IResponseUser[] = [];
      for (const user of userModels) {
        const response = new ResponseUser(user);
        await response.unwindAll(request);
        out.push(response);
      }

      return out;
    })
  )
  /**
   * @openapi
   * /users:
   *   post:
   *     description: Create a new user entry
   *     tags:
   *       - users
   *     requestBody:
   *       description: User object
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/IUser"
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .post(
    "/",
    asyncRouteHandler<IResponseGeneric>(async (request: IRequest) => {
      const userData = request.body as IUser;

      // force empty password + inactive status
      delete userData.password;
      userData.active = false;

      const user = new User(userData);
      if (!user.isValid()) {
        throw new ModelNotValidError("invalid model");
      }

      await request.db.lock();

      if (await User.findUserByLogin(request.db, userData.email)) {
        throw new UserNotUnique("email is in use");
      }
      if (await User.findUserByLogin(request.db, userData.name)) {
        throw new UserNotUnique("username is in use");
      }

      const hash = user.generateHash();
      if (!(await user.save(request.db.connection))) {
        throw new InternalServerError("cannot create user");
      }

      try {
        await mailer.sendTemplate(
          user.email,
          accountCreatedTemplate(
            user.name,
            `/activate?hash=${hash}&email=${user.email}`
          )
        );
      } catch (e) {
        throw new EmailError("please check the logs", (e as Error).toString());
      }

      return {
        result: true,
      };
    })
  )
  /**
   * @openapi
   * /users/{userId}:
   *   put:
   *     description: Update an existing user entry
   *     tags:
   *       - users
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the user entry
   *     requestBody:
   *       description: User object
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/IUser"
   *     responses:
   *       200:
   *         description: Returns generic response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .put(
    "/:userId",
    asyncRouteHandler<IResponseGeneric>(
      async (req: IRequest<{ userId: string }, Partial<IUser>>) => {
        const userId =
          req.params.userId !== "me"
            ? req.params.userId
            : req.getUserOrFail().id;
        const data = req.body;

        if (!userId || !data || Object.keys(data).length === 0) {
          throw new BadParams("user id and data have to be set");
        }

        const existingUser = await User.findUserById(req.db.connection, userId);
        if (!existingUser) {
          throw new UserDoesNotExits(
            `user with id ${userId} does not exist`,
            userId
          );
        }

        if (!existingUser.canBeEditedByUser(req.getUserOrFail())) {
          throw new PermissionDeniedError("user cannot be saved");
        }

        if (data.password) {
          data.password = hashPassword(data.password);
        }

        await req.db.lock();

        if (data.email && (await User.findUserByLogin(req.db, data.email))) {
          throw new UserNotUnique("email is in use");
        }

        if (data.name && (await User.findUserByLogin(req.db, data.name))) {
          throw new UserNotUnique("username is in use");
        }

        const result = await existingUser.update(req.db.connection, {
          ...data,
        });

        if (result.replaced || result.unchanged) {
          return {
            result: true,
          };
        } else {
          throw new InternalServerError(`cannot update user ${userId}`);
        }
      }
    )
  )
  /**
   * @openapi
   * /users/{userId}:
   *   delete:
   *     description: Removes the user entry
   *     tags:
   *       - users
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the user entry
   *     responses:
   *       200:
   *         description: Returns IResponseGeneric object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .delete(
    "/:userId",
    asyncRouteHandler<IResponseGeneric>(async (request: IRequest) => {
      const userId = request.params.userId;

      if (!userId) {
        throw new BadParams("user id has to be set");
      }

      const existingUser = await User.findUserById(
        request.db.connection,
        userId
      );
      if (!existingUser) {
        throw new UserDoesNotExits(
          `user with id ${userId} does not exist`,
          userId
        );
      }

      const result = await existingUser.delete(request.db.connection);

      if (result.deleted === 1) {
        return {
          result: true,
        };
      } else {
        return {
          result: false,
          error: "InternalServerError",
          message: `user ${userId} could not be removed`,
        };
      }
    })
  )
  /**
   * @openapi
   * /users/activation:
   *   post:
   *     description: Validates the activation hash, switch user to active state and setup initial password
   *     tags:
   *       - users
   *     parameters:
   *       - in: query
   *         name: hash
   *         schema:
   *           type: string
   *         required: true
   *         description: Hash for identyfing the user for which this activation should be done
   *     requestBody:
   *       description: data for password setup
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/IRequestActivationData"
   *     responses:
   *       200:
   *         description: Returns IResponseGeneric object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .post(
    "/activation",
    asyncRouteHandler<IResponseGeneric>(
      async (
        request: IRequest<
          any,
          Partial<IRequestActivationData>,
          { hash: string }
        >
      ) => {
        const hash = request.query.hash;
        const password = request.body.password;
        const passwordRepeat = request.body.passwordRepeat;

        if (!hash) {
          throw new BadParams("hash is required");
        }

        if (!password || password !== passwordRepeat) {
          throw new BadParams("mismatched or empty passwords");
        }

        const user = await User.getUserByHash(request.db.connection, hash);
        if (!user) {
          throw new UserDoesNotExits("user for provided hash not found", "");
        }

        user.setPassword(password);
        const results = await user.update(request.db.connection, {
          password: user.password,
          hash: undefined,
          active: true,
        });
        if (!results.replaced && !results.unchanged) {
          throw new InternalServerError("cannot update user");
        }

        return {
          result: true,
          message: "User activated.",
        };
      }
    )
  )
  /**
   * @openapi
   * /users/{userId}}/bookmarks:
   *   get:
   *     description: Returns list of bookmark folder entries for user
   *     tags:
   *       - users
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the user entry
   *     responses:
   *       200:
   *         description: Returns list of IResponseBookmarkFolder object
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: "#/components/schemas/IResponseBookmarkFolder"
   */
  .get(
    "/:userId/bookmarks",
    asyncRouteHandler<IResponseBookmarkFolder[]>(async (request: IRequest) => {
      if (!(request as any).user) {
        throw new BadParams("not logged");
      }

      const userId =
        request.params.userId !== "me"
          ? request.params.userId
          : (request as any).user.user.id;

      if (!userId) {
        throw new BadParams("user id has to be set");
      }

      const user = await User.findUserById(request.db.connection, userId);
      if (!user) {
        throw new UserDoesNotExits(
          `user with id ${userId} does not exist`,
          userId
        );
      }

      const response = new ResponseUser(user);
      await response.unwindBookmarks(request);

      return response.bookmarks;
    })
  )
  /**
   * @openapi
   * /users/{userId}}/password:
   *   patch:
   *     description: Reset the password of given user + sends email with raw password to the user
   *     tags:
   *       - users
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the user entry or 'me' to identify the current user
   *     responses:
   *       200:
   *         description: Returns IResponseGeneric object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .patch(
    "/:userId/password",
    asyncRouteHandler<IResponseGeneric>(async (request: IRequest) => {
      const userId = request.params.userId;

      if (!userId) {
        throw new BadParams("userId has to be set");
      }

      let user: User | null;

      if (userId === "me") {
        user = request.getUserOrFail();
      } else {
        user = await User.findUserById(request.db.connection, userId);
      }

      if (!user) {
        throw new UserDoesNotExits(`user ${userId} was not found`, userId);
      }

      const rawPassword = user.generatePassword();
      const result = await user.update(request.db.connection, {
        password: user.password,
      });

      if (!result.replaced && !result.unchanged) {
        throw new InternalServerError(`cannot update user ${userId}`);
      }

      console.log(`Password reset for ${user.email}`);

      try {
        await mailer.sendTemplate(
          user.email,
          passwordAdminResetTemplate(user.name, rawPassword)
        );
      } catch (e) {
        throw new EmailError("please check the logs", (e as Error).toString());
      }

      return {
        result: true,
        message: `Email with the new password has been sent. Click to copy the new password: '${rawPassword}'.`,
        data: rawPassword,
      };
    })
  )
  /**
   * @openapi
   * /users/me/emails/test:
   *   get:
   *     description: Sends test email
   *     tags:
   *       - users
   *     parameters:
   *       - in: query
   *         name: email
   *         schema:
   *           type: string
   *         required: true
   *         description: email address
   *     responses:
   *       200:
   *         description: Returns IResponseGeneric object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/IResponseGeneric"
   */
  .get(
    "/me/emails/test",
    asyncRouteHandler<IResponseGeneric>(async (request: IRequest) => {
      const user = request.getUserOrFail();
      const email = request.query.email as string;
      if (!email) {
        throw new BadParams("email has to be set");
      }

      try {
        await mailer.sendTemplate(email, testTemplate());
      } catch (e) {
        throw new EmailError("please check the logs", (e as Error).toString());
      }

      return {
        result: true,
        message: `Test email sent to ${email}`,
      };
    })
  );
