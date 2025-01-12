import Territory from "@models/territory/territory";
import User, { UserRight } from "@models/user/user";
import { getEntitiesDataByClass } from "@service/shorthands";
import { EntityEnums, UserEnums } from "@shared/enums";
import { IResponseTree, IStatement, ITerritory } from "@shared/types";
import { TerritoriesBrokenError } from "@shared/types/errors";
import { Connection } from "rethinkdb-ts";

export class TreeCreator {
  parentMap: Record<string, Territory[]>; // map of rootId -> childs
  statementsMap: Record<string, number>; // map of territoryId -> number of statements
  fullTree: IResponseTree | undefined;
  idMap: Record<string, IResponseTree>;

  constructor() {
    this.parentMap = {};
    this.statementsMap = {};
    this.idMap = {};
  }

  getRootTerritory(): Territory {
    return this.parentMap[""][0];
  }

  createParentMap(territories: Territory[]) {
    for (const territory of territories) {
      if (typeof territory.data.parent === "undefined") {
        continue;
      }

      const parentId: string = territory.data.parent
        ? territory.data.parent.territoryId
        : "";
      if (!this.parentMap[parentId]) {
        this.parentMap[parentId] = [];
      }
      this.parentMap[parentId].push(territory);
    }

    // only one root possible
    if (this.parentMap[""]?.length != 1) {
      throw new TerritoriesBrokenError("Territories tree is broken");
    }
  }

  populateTree(
    subtreeRoot: Territory,
    lvl: number,
    parents: string[]
  ): IResponseTree {
    const subtreeRootId = subtreeRoot.id;
    let childs: IResponseTree[] = [];
    let noOfStatements = 0;

    if (this.parentMap[subtreeRootId]) {
      childs = this.parentMap[subtreeRootId].map((ter) => {
        const path = [];
        for (const parent of parents) {
          path.push(parent);
        }
        path.push(subtreeRootId);
        return this.populateTree(ter, lvl + 1, path);
      });
    }

    if (this.statementsMap[subtreeRootId]) {
      noOfStatements = this.statementsMap[subtreeRootId];
    }

    const childsAreEmpty = !childs.find((ch) => !ch.empty);

    this.idMap[subtreeRoot.id] = {
      territory: subtreeRoot as ITerritory,
      statementsCount: noOfStatements,
      lvl,
      children: childs,
      path: parents,
      empty: childsAreEmpty && !noOfStatements,
      right: UserEnums.RoleMode.Read,
    };

    this.fullTree = this.idMap[subtreeRoot.id];

    return this.fullTree;
  }

  applyPermissions(
    tree: IResponseTree | undefined,
    user: User
  ): IResponseTree | null {
    if (!tree) {
      return null;
    }

    const filtered: IResponseTree[] = [];
    for (const child of tree.children) {
      const filteredChild = this.applyPermissions(child, user);
      if (filteredChild) {
        filtered.push(filteredChild);
      }
    }

    if (
      tree.lvl > 0 &&
      filtered.length === 0 &&
      !(tree.territory as Territory).canBeViewedByUser(user)
    ) {
      return null;
    }

    return {
      ...tree,
      children: filtered,
      right: (tree.territory as Territory).getUserRoleMode(user),
    };
  }

  static sortTerritories(terA: ITerritory, terB: ITerritory): number {
    return (
      (terA.data.parent ? terA.data.parent.order : 0) -
      (terB.data.parent ? terB.data.parent.order : 0)
    );
  }

  static async countStatements(
    db: Connection
  ): Promise<Record<string, number>> {
    const statements = (
      await getEntitiesDataByClass<IStatement>(db, EntityEnums.Class.Statement)
    ).filter((s) => s.data.territory && s.data.territory.territoryId);
    const statementsCountMap: Record<string, number> = {}; // key is territoryid
    for (const statement of statements) {
      if (statement.data.territory) {
        const terId = statement.data.territory.territoryId;
        if (!statementsCountMap[terId]) {
          statementsCountMap[terId] = 0;
        }
        statementsCountMap[terId]++;
      }
    }

    return statementsCountMap;
  }
}

export class TreeCache {
  tree: TreeCreator;
  db: Connection | undefined;

  constructor() {
    this.tree = new TreeCreator();
  }

  async initialize() {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    if (!this.db) {
      console.error("No Db in TreeCache");
      return;
    }

    this.tree = await this.createTree();
    console.log("[TreeCache.initialize]: done");
  }

  async createTree(): Promise<TreeCreator> {
    const newTree = new TreeCreator();

    const [territoriesData, statementsCountMap] = await Promise.all([
      getEntitiesDataByClass<ITerritory>(
        this.db as Connection,
        EntityEnums.Class.Territory
      ),
      TreeCreator.countStatements(this.db as Connection),
    ]);

    newTree.createParentMap(
      territoriesData
        .filter((td) => !td.isTemplate)
        .sort(TreeCreator.sortTerritories)
        .map((td) => new Territory({ ...td }))
    );
    newTree.statementsMap = statementsCountMap;

    newTree.populateTree(newTree.getRootTerritory(), 0, []);

    return newTree;
  }

  forUser(user: User): IResponseTree {
    const out = this.tree.applyPermissions(this.tree.fullTree, user);
    if (!out) {
      return {
        children: [],
        lvl: 0,
        path: [],
        right: UserEnums.RoleMode.Read,
        statementsCount: 0,
        territory: new Territory({}) as ITerritory,
        empty: true,
      };
    }

    return out;
  }

  findRightInParentTerritory(
    terId: string,
    rights: UserRight[]
  ): UserRight | undefined {
    const ter = this.tree.idMap[terId];
    if (!ter) {
      return undefined;
    }

    // array of [T0, T1, T1-1, T1-1-3] etc, needs to be reversed to go from closest to farthest
    for (let i = ter.path.length - 1; i >= 0; i--) {
      const parentId = ter.path[i];
      for (const right of rights) {
        if (right.territory === parentId) {
          // this is automatically closest match
          return right;
        }
      }
    }

    // sadly, no right found upwards (towards the T0)
    return undefined;
  }

  /**
   * Attemts to find closest right for child subtrees.
   * This method uses leftmost tree search.
   * @param terId
   * @param rights
   * @returns
   */
  findRightInChildTerritory(
    terId: string,
    rights: UserRight[]
  ): UserRight | undefined {
    const ter = this.tree.idMap[terId];
    if (!ter) {
      return undefined;
    }

    for (const right of rights) {
      if (right.territory === terId) {
        // this is automatically the closest match
        return right;
      }

      // go deeper for each child
      for (const child of ter.children) {
        const rightInChild = this.findRightInChildTerritory(
          child.territory.id,
          rights
        );
        if (rightInChild) {
          return rightInChild;
        }
      }
    }

    // sadly, no right found upwards (towards the T0)
    return undefined;
  }

  /**
   * Attempts to find closest right applicable to territory
   * @param terId
   * @param rights
   * @returns
   */
  getRightForTerritory(
    terId: string,
    rights: UserRight[]
  ): UserRight | undefined {
    // exact match - territory matches to user right
    const exactRight = rights.find((r) => r.territory === terId);
    if (exactRight) {
      return exactRight;
    }

    // first parent in the way up to root T should be used
    let derivedRight = this.findRightInParentTerritory(terId, rights);
    if (derivedRight) {
      return derivedRight;
    }

    // searching for right derived from some child territory
    derivedRight = this.findRightInChildTerritory(terId, rights);
    if (derivedRight) {
      // if the right is found - it must be changed to VIEW right
      return new UserRight({
        mode: UserEnums.RoleMode.Read,
        territory: derivedRight.territory,
      });
    }

    return undefined;
  }
}

const treeCache: TreeCache = new TreeCache();
export default treeCache;

export async function prepareTreeCache(db: Connection) {
  treeCache.db = db;
  await treeCache.initialize();
}
