import "ts-jest";
import request from "supertest";
import { supertestConfig } from "..";
import { apiPath } from "../../common/constants";
import app from "../../Server";
import { IStatement } from "@shared/types";
import { Db } from "@service/RethinkDB";
import { deleteActants } from "@service/shorthands";
import Territory from "@models/territory";
import Statement from "@models/statement";
import { ActantType } from "@shared/enums";

describe("Territories getActantIds", () => {
  let db: Db;
  const baseStatementData = new Statement({});
  beforeAll(async () => {
    db = new Db();
    await db.initDb();
  });

  beforeEach(async () => {
    await deleteActants(db);
  });

  afterAll(async () => {
    await db.close();
  });

  // TODO THERE WAS MORE TESTS LIKE THIS>>>WHERE ARE THEY
  describe("one territory, two linked statement via references.resource and tags at once", () => {
    it("should return empty array", async (done) => {
      const territory = new Territory(undefined);
      await territory.save(db.connection);

      // statements linked by tag/reference and territory - 3 linked actants
      const statementData1: IStatement = JSON.parse(
        JSON.stringify(baseStatementData)
      );
      statementData1.data.territory.id = territory.id;
      statementData1.data.tags = ["tagid"];
      statementData1.data.references = [
        {
          id: "",
          part: "",
          resource: "refid",
          type: "",
        },
      ];
      // second statement is the same - should not duplicate ids
      const statementData2: IStatement = JSON.parse(
        JSON.stringify(statementData1)
      );

      const statement1 = new Statement({ ...statementData1 });
      await statement1.save(db.connection);
      const statement2 = new Statement({ ...statementData2 });
      await statement2.save(db.connection);

      await request(app)
        .get(`${apiPath}/territories/getActantIds/${territory.id}`)
        .set("authorization", "Bearer " + supertestConfig.token)
        .expect(200)
        .expect((res: Request) => {
          expect(res.body).not.toBeNull();
          expect(res.body?.constructor.name).toEqual("Array");
          expect(res.body).toHaveLength(3);
        });

      done();
    });
  });
});
