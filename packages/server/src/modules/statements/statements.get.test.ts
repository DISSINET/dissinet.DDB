import "@modules/common.test";
import { BadParams, StatementDoesNotExits } from "@shared/types/errors";
import request from "supertest";
import { supertestConfig } from "..";
import { apiPath } from "../../common/constants";
import app from "../../Server";
import { IResponseStatement } from "@shared/types";
import { Db } from "@service/RethinkDB";
import { createActant } from "@service/shorthands";
import { ActantType } from "@shared/enums";
import Statement from "@models/statement";

const testValidStatement = (res: any) => {
  res.body.should.not.empty;
  res.body.should.be.a("object");
  const actionExample: IResponseStatement = {
    id: "",
    class: ActantType.Statement,
    data: {
      action: "",
      territory: {
        id: "",
        order: 0,
      },
      references: [],
      tags: [],
      certainty: "",
      elvl: "",
      modality: "",
      text: "",
      note: "",
      props: [],
      actants: [],
    },
    label: "",
    actants: [],
    audits: [],
    usedIn: [],
  };
  res.body.should.have.keys(Object.keys(actionExample));
  res.body.id.should.not.empty;
};

describe("Statements get", function () {
  describe("Empty param", () => {
    it("should return a 400 code with BadParams error", (done) => {
      return request(app)
        .get(`${apiPath}/statements/get`)
        .set("authorization", "Bearer " + supertestConfig.token)
        .expect(400)
        .expect({ error: new BadParams("whatever").toString() })
        .then(() => done());
    });
  });
  describe("Wrong param", () => {
    it("should return a 400 code with ActantDoesNotExits error", (done) => {
      return request(app)
        .get(`${apiPath}/statements/get/invalidId12345`)
        .set("authorization", "Bearer " + supertestConfig.token)
        .expect(400)
        .expect({ error: new StatementDoesNotExits("whatever").toString() })
        .then(() => done());
    });
  });
  describe("Correct param", () => {
    it("should return a 200 code with IResponseStatement response", async (done) => {
      const db = new Db();
      await db.initDb();
      const randomId = Math.random().toString();
      await createActant(
        db,
        new Statement({ id: randomId, data: { territory: { id: "2" } } })
      );
      return request(app)
        .get(`${apiPath}/statements/get/${randomId}`)
        .set("authorization", "Bearer " + supertestConfig.token)
        .expect(200)
        .expect(testValidStatement)
        .then(() => done());
    });
  });
});
