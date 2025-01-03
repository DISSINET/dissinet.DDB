import { StatementTerritory } from "@models/statement/statement";
import { prepareStatement } from "@models/statement/statement.test";
import Territory, { TerritoryParent } from "@models/territory/territory";
import entities from "@modules/entities";
import { Db } from "@service/rethink";
import { deleteEntities } from "@service/shorthands";
import { EntityEnums } from "@shared/enums";
import { IEntity, RequestSearch } from "@shared/types";
import Entity from "./entity";
import { prepareEntity } from "./entity.test";
import {
  SearchQuery,
  sortByLength,
  sortByRequiredOrder,
  sortByWordMatch,
} from "./response-search";

describe("models/response-search", function () {
  describe("search by territory", function () {
    let db: Db;

    beforeAll(async () => {
      db = new Db();
      await db.initDb();
    });

    beforeEach(async () => {
      await deleteEntities(db);
    });

    afterAll(async () => {
      await db.close();
    });

    describe("not existing territoryId", () => {
      const req = new RequestSearch({ territoryId: "not exists" });
      req.entityIds = undefined;

      it("entity ids should empty", async () => {
        const query = new SearchQuery(db.connection);
        await query.fromRequest(req);
        expect(req.entityIds).toEqual([]);
      });
    });

    describe("existing territory", () => {
      const [id1a, st1a] = prepareStatement();
      const [id2a, st2a] = prepareStatement();

      const t1Id = `t-${id1a}`;
      const t2Id = `t-${id2a}`;

      st1a.data.territory = new StatementTerritory({ territoryId: t1Id });
      st2a.data.territory = new StatementTerritory({ territoryId: t2Id });

      const req = new RequestSearch({ territoryId: t1Id });

      it("entity ids should have all ids from st1a", async () => {
        await st1a.save(db.connection);
        await st2a.save(db.connection);

        const query = new SearchQuery(db.connection);
        await query.fromRequest(req);
        expect(req.entityIds).toEqual(st1a.getEntitiesIds());
      });
    });

    describe("existing territory + subTerritorySearch flag", () => {
      const parentT = new Territory({ id: "t0" });
      const childT1 = new Territory({ id: "t0-1" });
      const childT2 = new Territory({ id: "t0-2" });
      const childT3 = new Territory({ id: "t0-3" });

      childT1.data.parent = new TerritoryParent({ territoryId: parentT.id });
      childT2.data.parent = new TerritoryParent({ territoryId: parentT.id });
      childT3.data.parent = new TerritoryParent({ territoryId: parentT.id });

      const [, st1a] = prepareStatement();
      const [, st2a] = prepareStatement();

      st1a.data.territory = new StatementTerritory({ territoryId: childT1.id });
      st2a.data.territory = new StatementTerritory({ territoryId: childT2.id });

      const req = new RequestSearch({
        territoryId: parentT.id,
        subTerritorySearch: true,
      });

      it("entity ids should have all ids from st1a and st2a", async () => {
        await parentT.save(db.connection);
        await childT1.save(db.connection);
        await childT2.save(db.connection);
        await childT3.save(db.connection);
        await st1a.save(db.connection);
        await st2a.save(db.connection);

        const query = new SearchQuery(db.connection);
        await query.fromRequest(req);
        expect(req.entityIds).toEqual(
          st1a.getEntitiesIds().concat(st2a.getEntitiesIds())
        );
      });
    });
  });

  describe("advanced label search", function () {
    let db: Db;
    const rand = Math.random().toString();

    const [, nameEntity] = prepareEntity();
    nameEntity.labels[0] = "Evelín Teměř Jr.";
    nameEntity.id = `${nameEntity.labels[0]}-${nameEntity.id}`;
    nameEntity.class = EntityEnums.Class.Person;

    const [, eventEntity] = prepareEntity();
    eventEntity.labels[0] = "TRP yyyy-mm-dd: during";
    eventEntity.id = `${eventEntity.labels[0]}-${eventEntity.id}`;
    eventEntity.class = EntityEnums.Class.Event;

    beforeAll(async () => {
      db = new Db();
      await db.initDb();

      await nameEntity.save(db.connection);
      await eventEntity.save(db.connection);
    });

    afterAll(async () => {
      await deleteEntities(db);
      await db.close();
    });

    describe("search by word", () => {
      it("should return found result when searching word by word", async () => {
        const words = eventEntity.labels[0]
          .replace(/[^a-zA-Z0-9]+/g, " ")
          .split(" ")
          .map((w) => w.trim());
        for (const word of words) {
          const entities = await new SearchQuery(db.connection)
            .whereLabel(`*${word}*`)
            .do();
          try {
            expect(entities).toHaveLength(1);
          } catch (e) {
            throw new Error(`*${word}* not satisfied`);
          }
        }
      });
    });

    describe("search by parts", () => {
      it("should return found a result when searching by parts", async () => {
        const parts = [
          "Evelín Teměř Jr",
          "Evelín Teměř Jr.",
          "Teměř",
          "Evelín",
          "Jr",
          "Jr.",
          "Temě*",
          "Evel*",
          "Teměř Jr",
        ];
        for (const part of parts) {
          const entities = await new SearchQuery(db.connection)
            .whereLabel(part)
            .do();
          try {
            expect(entities).toHaveLength(1);
          } catch (e) {
            throw new Error(`${part} not satisfied`);
          }
        }
      });
    });
  });

  describe("test sorting", function () {
    const entitites: IEntity[] = [
      new Entity({ id: "1", labels: ["one"] }),
      new Entity({ id: "2", labels: ["three"] }),
      new Entity({ id: "3", labels: ["one hundred and six"] }),
      new Entity({ id: "4", labels: ["five"] }),
      new Entity({ id: "5", labels: ["six"] }),
      new Entity({ id: "6", labels: ["seven"] }),
      new Entity({ id: "7", labels: ["eight"] }),
      new Entity({ id: "8", labels: ["eleven"] }),
      new Entity({ id: "9", labels: ["twenty-one"] }),
      new Entity({ id: "10", labels: ["onehundred"] }),
    ];

    describe("sortByLength", () => {
      it("should return entities in expected order", function () {
        const sorted = sortByLength(entitites);
        const sortedLabels = sorted.map((e) => e.labels[0]);
        const expectedSortedLabels = [
          "one",
          "six",
          "five",
          "three",
          "seven",
          "eight",
          "eleven",
          "twenty-one",
          "onehundred",
          "one hundred and six",
        ];

        expect(sortedLabels).toEqual(expectedSortedLabels);
      });
    });

    describe("sortByWordMatch without label", () => {
      it("should return entities in unchanged order", function () {
        const sorted = sortByWordMatch(entitites, "");
        const sortedLabels = sorted.map((e) => e.labels[0]);
        const expectedSortedLabels = entitites.map((e) => e.labels[0]);

        expect(sortedLabels).toEqual(expectedSortedLabels);
      });
    });

    describe("sortByWordMatch with label matching more entities", () => {
      const sorted = sortByWordMatch(entitites, "one");
      const sortedLabels = sorted.map((e) => e.labels[0]);

      it("should return first entity to be the one with exact match and smallest length", function () {
        expect(sortedLabels[0]).toEqual("one");
      });

      it("should return second entity the one still matching the word because it is on the lowest index", function () {
        expect(sortedLabels[1]).toEqual("one hundred and six");
      });

      it("should return third entity the one still matching the word because it is on the lowest index", function () {
        expect(sortedLabels[2]).toEqual("twenty-one");
      });

      it("should return fourth entity as the one without matching words but it is stored on lowest index", function () {
        expect(sortedLabels[3]).toEqual("three");
      });
    });

    describe("sortByRequiredOrder with empty wanted list", () => {
      it("should return empty list", function () {
        const sorted = sortByRequiredOrder(entitites, []);
        expect(sorted).toEqual([]);
      });
    });

    describe("sortByRequiredOrder with non empty", () => {
      it("should return first and last entity in expected order", function () {
        const sorted = sortByRequiredOrder(
          entitites,
          entitites.map((e) => e.id).reverse()
        );
        expect(sorted).toHaveLength(entitites.length);
        expect(sorted[0].id).toEqual(entitites[entitites.length - 1].id);
        expect(sorted[sorted.length - 1].id).toEqual(entitites[0].id);
      });
    });
  });

  describe("search by language", function () {
    let db: Db;
    const rand = Math.random().toString();

    const [, entity1] = prepareEntity();
    entity1.language = EntityEnums.Language.Czech;
    const [, entity2] = prepareEntity();
    entity2.language = EntityEnums.Language.German;
    const [, entity3] = prepareEntity();
    entity3.language = EntityEnums.Language.Czech;

    beforeAll(async () => {
      db = new Db();
      await db.initDb();

      await entity1.save(db.connection);
      await entity2.save(db.connection);
      await entity3.save(db.connection);
    });

    afterAll(async () => {
      await deleteEntities(db);
      await db.close();
    });

    describe("search for non existing language", () => {
      it("should return empty list", async () => {
        const entities = await new SearchQuery(db.connection)
          .whereLanguage(EntityEnums.Language.Hungarian)
          .do();
        try {
          expect(entities).toHaveLength(0);
        } catch (e) {
          throw new Error("non-existing language not satisfied");
        }
      });
    });

    describe("search for existing language present in 2 entities", () => {
      it("should return list of 2 results", async () => {
        const entities = await new SearchQuery(db.connection)
          .whereLanguage(EntityEnums.Language.Czech)
          .do();
        try {
          expect(entities).toHaveLength(2);
        } catch (e) {
          throw new Error(
            "existing language present in 2 entities not satisfied"
          );
        }
      });
    });
  });

  describe("search by classes", function () {
    let db: Db;
    const rand = Math.random().toString();

    const [, entity1] = prepareEntity();
    entity1.class = EntityEnums.Class.Action;
    const [, entity2] = prepareEntity();
    entity2.class = EntityEnums.Class.Group;
    const [, entity3] = prepareEntity();
    entity3.class = EntityEnums.Class.Location;
    const [, entity4] = prepareEntity();
    entity4.class = EntityEnums.Class.Location;

    beforeAll(async () => {
      db = new Db();
      await db.initDb();

      await entity1.save(db.connection);
      await entity2.save(db.connection);
      await entity3.save(db.connection);
      await entity4.save(db.connection);
    });

    afterAll(async () => {
      await deleteEntities(db);
      await db.close();
    });

    describe("search for entities by evading a class values", () => {
      it("should return empty list if not wanting any of stored classes", async () => {
        const entities = await new SearchQuery(db.connection)
          .whereNotClass([entity1, entity2, entity3].map((e) => e.class))
          .do();
        try {
          expect(entities).toHaveLength(0);
        } catch (e) {
          throw new Error("whereNotClass (1) not satisfied");
        }
      });

      it("should return entities which does not have particular classes", async () => {
        const entities = await new SearchQuery(db.connection)
          .whereNotClass([entity1, entity2].map((e) => e.class))
          .do();
        try {
          expect(entities).toHaveLength(2);
          expect(entities.find((e) => e.id === entity4.id)).toBeTruthy();
        } catch (e) {
          throw new Error("whereNotClass (2) not satisfied");
        }
      });
    });

    describe("search for specific class", () => {
      it("should return list of 2 results if there are 2 entities with the same class", async () => {
        const entities = await new SearchQuery(db.connection)
          .whereClass(entity3.class)
          .do();
        try {
          expect(entities).toHaveLength(2);
        } catch (e) {
          throw new Error("existing class for two locations not satisfied");
        }
      });

      it("should return list of 1 result if there is only one entity with the class", async () => {
        const entities = await new SearchQuery(db.connection)
          .whereClass(entity1.class)
          .do();
        try {
          expect(entities).toHaveLength(1);
        } catch (e) {
          throw new Error("existing class for one class entry not satisfied");
        }
      });
    });
  });

  describe("search by grouped conditions", function () {
    let db: Db;
    const rand = Math.random().toString();

    const [, entity1] = prepareEntity();
    entity1.class = EntityEnums.Class.Action;
    const [, entity2] = prepareEntity();
    entity2.class = EntityEnums.Class.Group;
    const [, entity3] = prepareEntity();
    entity3.class = EntityEnums.Class.Location;
    const [, entity4] = prepareEntity();
    entity4.class = EntityEnums.Class.Location;

    beforeAll(async () => {
      db = new Db();
      await db.initDb();

      await entity1.save(db.connection);
      await entity2.save(db.connection);
      await entity3.save(db.connection);
      await entity4.save(db.connection);
    });

    afterAll(async () => {
      await deleteEntities(db);
      await db.close();
    });

    describe("search for class while restricting results by id", () => {
      it("should return empty list if class-entity does not have provided id", async () => {
        const entities = await new SearchQuery(db.connection)
          .whereEntityIds([entity2.id, entity3.id, entity4.id])
          .whereClass(entity1.class)
          .do();
        try {
          expect(entities).toHaveLength(0);
        } catch (e) {
          throw new Error(
            "whereClass + whereEntityIds without match not satisfied"
          );
        }
      });

      it("should return entities that match both filters", async () => {
        const entities = await new SearchQuery(db.connection)
          .whereEntityIds([entity1, entity2, entity3, entity4].map((e) => e.id))
          .whereClass(entity3.class)
          .do();
        try {
          expect(entities).toHaveLength(2);
          expect(entities.find((e) => e.id === entity3.id)).toBeTruthy();
          expect(entities.find((e) => e.id === entity4.id)).toBeTruthy();
        } catch (e) {
          throw new Error(
            "whereClass + whereEntityIds with match not satisfied"
          );
        }
      });
    });
  });
});
