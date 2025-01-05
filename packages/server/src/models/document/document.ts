import { IDbModel } from "@models/common";
import { r as rethink, Connection, WriteResult, RDatum } from "rethinkdb-ts";
import { IDocument, IEntity } from "@shared/types";
import { EntityEnums, UserEnums } from "@shared/enums";
import { InternalServerError, ModelNotValidError } from "@shared/types/errors";
import User from "@models/user/user";

export class TreeNode {
  anchor: string; // The tag name (entity id)
  children: TreeNode[] = []; // Nested children (other nodes)
  content: string = ""; // Text content within the tag
  class?: EntityEnums.Class; // will be populated in Document.assignClassesBasedOnEntities

  static MAX_CONTENT_LENGTH = 20;

  constructor(anchor: string, content: string = "") {
    this.anchor = anchor;
    this.content = content;
  }

  /**
   * Returns sanitized content - shortened to MAX_CONTENT_LENGTH chars
   * @returns
   */
  getShortContent(): string {
    if (this.content.length > TreeNode.MAX_CONTENT_LENGTH) {
      return this.content.slice(0, TreeNode.MAX_CONTENT_LENGTH) + "...";
    }
    return this.content;
  }
}

export default class Document implements IDocument, IDbModel {
  static table = "documents";

  id = "";
  title: string;
  content: string;
  entityIds: string[] = [];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: Partial<IDocument>) {
    this.id = data.id || "";
    this.title = data.title || "";
    this.content = data.content || "";
    this.createdAt = data.createdAt || new Date();
    if (data.updatedAt !== undefined) {
      this.updatedAt = data.updatedAt;
    }
    this.entityIds = this.findEntities();
  }

  /**
   * Parses the raw content and finds tags - entity ids
   * @returns
   */
  findEntities(): string[] {
    const regex = /<([\w-\.]+)>/g;
    let match;

    const entities = [];

    while ((match = regex.exec(this.content)) !== null) {
      entities.push(match[1]);
    }

    const uEntities = [...new Set(entities)];

    return uEntities;
  }

  /**
   * Finds content inside anchor-tags specified by entity id(tag)
   * @param tag
   * @returns
   */
  findAnchors(tag: string): string[] {
    const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, "g");

    const result: string[] = [];

    let match;
    while ((match = regex.exec(this.content)) !== null) {
      // match[1] contains the text inside the tag
      result.push(match[1]);
    }

    return result;
  }

  buildAnchorsTree(): TreeNode[] {
    const tagPattern = /<\/?([\w\-.]+)>/g; // Regex to match <tag> or </tag>
    const rootNodes: TreeNode[] = [];
    const nodeStack: TreeNode[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(this.content)) !== null) {
      const tag = match[1];
      const isClosingTag = this.content[match.index + 1] === "/";

      if (match.index > lastIndex) {
        const text = this.content.slice(lastIndex, match.index);
        if (text.length > 0 && nodeStack.length > 0) {
          nodeStack[nodeStack.length - 1].content += text;
        }
      }

      if (!isClosingTag) {
        // Open tag: Create a new node for the tag
        const newNode = new TreeNode(tag);
        if (nodeStack.length > 0) {
          nodeStack[nodeStack.length - 1].children.push(newNode);
        } else {
          // Root level node
          rootNodes.push(newNode);
        }
        // Push the new node onto the stack (start processing its children)
        nodeStack.push(newNode);
      } else {
        // Close tag: Pop the node off the stack
        const closedNode = nodeStack.pop();

        // If there's a parent node, merge the content of the closed node into its parent (remove tag, keep content)
        if (closedNode && nodeStack.length > 0) {
          nodeStack[nodeStack.length - 1].content += closedNode.content;
        }
      }

      lastIndex = tagPattern.lastIndex;
    }

    // Handle any remaining text after the last tag
    if (lastIndex < this.content.length) {
      const remainingText = this.content.slice(lastIndex).trim();
      if (remainingText.length > 0 && nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].content += remainingText;
      }
    }

    return rootNodes;
  }

  flattenTree(nodes: TreeNode[]): TreeNode[] {
    const flatList: TreeNode[] = [];

    function recurse(node: TreeNode) {
      flatList.push(node); // Add current node to flat list
      // Recurse through each child and flatten them
      node.children.forEach((child) => recurse(child));
    }

    // Start recursion for each root node
    nodes.forEach((node) => recurse(node));

    return flatList;
  }

  collectAnchors(nodes: TreeNode[]): string[] {
    const result: string[] = [];

    nodes.forEach((node) => {
      result.push(node.anchor); // Add the anchor of the current node

      // Recursively collect anchors from the children
      if (node.children.length > 0) {
        result.push(...this.collectAnchors(node.children));
      }
    });

    return result;
  }

  assignClassesBasedOnEntities(tree: TreeNode[], entities: IEntity[]): void {
    const entityMap = new Map(
      entities.map((entity) => [entity.id, entity.class])
    ); // Create a map for faster lookup

    function recurse(nodes: TreeNode[]) {
      nodes.forEach((node) => {
        // Check if the anchor matches any entity id
        if (entityMap.has(node.anchor)) {
          node.class = entityMap.get(node.anchor) || undefined; // Assign class if a match is found
        }
        // Recursively process children
        recurse(node.children);
      });
    }

    recurse(tree); // Start recursion
  }

  /**
   * Stores the document in the db
   * @param db db connection
   * @returns Promise<boolean> to indicate result of the operation
   */
  async save(db: Connection | undefined): Promise<boolean> {
    this.createdAt = new Date();

    const result = await rethink
      .table(Document.table)
      .insert({ ...this, id: this.id || undefined })
      .run(db);

    if (result.generated_keys) {
      this.id = result.generated_keys[0];
    }

    if (result.first_error && result.first_error.indexOf("Duplicate") !== -1) {
      throw new ModelNotValidError("id already exists");
    }

    return result.inserted === 1;
  }

  /**
   * Alters the document using provided object
   * @param db Connection
   * @returns updateData Partial<IDocument>
   */
  update(
    db: Connection | undefined,
    updateData: Partial<IDocument>
  ): Promise<WriteResult> {
    this.updatedAt = updateData.updatedAt = new Date();
    delete updateData.createdAt;
    return rethink
      .table(Document.table)
      .get(this.id)
      .update(updateData)
      .run(db);
  }

  /**
   * Deletes the document
   * @param db Connection
   * @returns boolean
   */
  async delete(db: Connection): Promise<WriteResult> {
    if (!this.id) {
      throw new InternalServerError(
        "delete called on document with undefined id"
      );
    }

    const result = await rethink
      .table(Document.table)
      .get(this.id)
      .delete()
      .run(db);

    return result;
  }

  /**
   * Predicate for testing if the document is valid
   * @returns boolean
   */
  isValid(): boolean {
    if (!this.content) {
      return false;
    }
    if (!this.title) {
      return false;
    }
    return true;
  }

  /**
   * Predicate for testing if the document can be viewed by provided user
   * @param user User
   * @returns boolean
   */
  canBeViewedByUser(user: User): boolean {
    return true;
  }

  /**
   * Predicate for testing if the document can be created by provided user
   * @param user User
   * @returns boolean
   */
  canBeCreatedByUser(user: User): boolean {
    return true;
  }

  /**
   * Predicate for testing if the document can be edited by provided user
   * @param user User
   * @returns boolean
   */
  canBeEditedByUser(user: User): boolean {
    return user.role !== UserEnums.Role.Viewer;
  }

  /**
   * Predicate for testing if the document can be deleted by provided user
   * @param user User
   * @returns boolean
   */
  canBeDeletedByUser(user: User): boolean {
    return true;
  }

  removeAnchors(entityIds: string[]) {
    for (const entityId of entityIds) {
      const tagRegex = new RegExp(`<\\/?${entityId}(>|$)`, "g");
      const updatedContent = this.content.replace(tagRegex, "");
      this.content = updatedContent;
      this.entityIds = this.entityIds.filter((id) => id !== entityId);
    }
  }

  removeAnchor(entityId: string, index: number) {
    const tagRegex = new RegExp(`<\\/?${entityId}(>|$)`, "g");
    let match;
    let count = 0;
    let positions: { start: number; end: number }[] = [];

    // Find all matching tags in the content
    while ((match = tagRegex.exec(this.content)) !== null) {
      if (match[0] === `<${entityId}>`) {
        // Start tag position
        positions.push({ start: match.index, end: -1 });
      } else if (match[0] === `</${entityId}>`) {
        // End tag position
        if (
          positions.length > 0 &&
          positions[positions.length - 1].end === -1
        ) {
          positions[positions.length - 1].end = match.index + match[0].length;
          count++;
        }
      }
    }

    // Out of bounds
    if (index < 0 || index >= positions.length) {
      return;
    }

    const targetTag = positions[index];
    if (targetTag.start !== -1 && targetTag.end !== -1) {
      this.content =
        this.content.slice(0, targetTag.start) +
        this.content.slice(
          targetTag.start + `<${entityId}>`.length,
          targetTag.end - `</${entityId}>`.length
        ) +
        this.content.slice(targetTag.end);
    }
  }

  /**
   * search for single document by ids
   * @param db Connection database connection
   * @param documentId string id
   * @returns Promise<Document> wanted document
   */
  static async getDocumentById(
    db: Connection,
    documentId: string
  ): Promise<Document | null> {
    const data = await rethink.table(Document.table).get(documentId).run(db);

    return data ? new Document(data) : null;
  }

  /**
   * search for multiple documents by ids
   * @param db Connection database connection
   * @param documentIds string[] list of ids
   * @returns Promise<Document[]> list of documents
   */
  static async findDocumentsByIds(
    db: Connection,
    documentIds: string[]
  ): Promise<Document[]> {
    const entries = await rethink
      .table(Document.table)
      .getAll(documentIds)
      .run(db);

    return entries && entries.length ? entries.map((d) => new Document(d)) : [];
  }

  /**
   *
   * @param db
   * @param entityId
   * @returns
   */
  static async findByEntityId(
    db: Connection,
    entityId: string
  ): Promise<IDocument[]> {
    const entries = await rethink
      .table(Document.table)
      .filter(function (row: RDatum) {
        return row("entityIds").contains(entityId);
      })
      .run(db);

    return entries && entries.length ? (entries as IDocument[]) : [];
  }

  /**
   * Retrieves all documents
   * @param db Connection database connection
   * @returns Promise<IDocument[]> list of documents
   */
  static async getAll(db: Connection): Promise<IDocument[]> {
    const entries = await rethink
      .table(Document.table)
      .orderBy(rethink.asc("createdAt"))
      .run(db);
    return entries && entries.length ? entries : [];
  }
}
