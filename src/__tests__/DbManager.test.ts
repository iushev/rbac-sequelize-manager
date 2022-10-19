import { Sequelize } from "sequelize";

import { BaseManager, ItemType, Permission, Role, Rule } from "@iushev/rbac";

import initModels from "../models";
import DbManager from "../DbManager";

import AuthorRule from "./AuthorRule";
import ActionRule from "./ActionRule";

export async function prepareData(rbacManager: BaseManager) {
  AuthorRule.init(rbacManager);
  ActionRule.init(rbacManager);

  const authorRule = new AuthorRule();
  await rbacManager.add(authorRule);

  const uniqueTrait = new Permission({
    name: "Fast Metabolism",
    description: "Your metabolic rate is twice normal",
  });
  await rbacManager.add(uniqueTrait);

  const createPost = new Permission({ name: "createPost", description: "Create a post" });
  await rbacManager.add(createPost);

  const readPost = new Permission({ name: "readPost", description: "Read a post" });
  await rbacManager.add(readPost);

  const deletePost = new Permission({ name: "deletePost", description: "Delete a post" });
  await rbacManager.add(deletePost);

  const updatePost = new Permission({ name: "updatePost", description: "Update any post" });
  await rbacManager.add(updatePost);

  const updateOwnPost = new Permission({
    name: "updateOwnPost",
    description: "Update own post",
    ruleName: authorRule.name,
  });
  await rbacManager.add(updateOwnPost);
  await rbacManager.addChild(updateOwnPost, updatePost);

  const withoutChildren = new Role({ name: "withoutChildren" });
  await rbacManager.add(withoutChildren);

  const reader = new Role({ name: "reader" });
  await rbacManager.add(reader);
  await rbacManager.addChild(reader, readPost);

  const author = new Role({ name: "author" });
  await rbacManager.add(author);
  await rbacManager.addChild(author, reader);
  await rbacManager.addChild(author, createPost);
  await rbacManager.addChild(author, updateOwnPost);

  const admin = new Role({ name: "admin" });
  await rbacManager.add(admin);
  await rbacManager.addChild(admin, author);
  await rbacManager.addChild(admin, updatePost);

  await rbacManager.assign(uniqueTrait, "reader");

  await rbacManager.assign(reader, "reader");
  await rbacManager.assign(author, "author A");
  await rbacManager.assign(author, "author B");
  await rbacManager.assign(deletePost, "author B");
  await rbacManager.assign(admin, "admin");
}

describe("Testing DbManager", () => {
  const sequelize = new Sequelize(process.env.DATABASE_URL ?? "", {
    dialect: "postgres",
    logging: false,
  });
  initModels(sequelize);

  const auth = new DbManager({
    sequelize,
    defaultRoles: ["myDefaultRole"],
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await auth.removeAll();
  });

  test("Add item", async () => {
    const role = new Role({
      name: "admin",
      description: "administrator",
    });
    expect(await auth.add(role)).toBeTruthy();

    const permission = new Permission({
      name: "edit post",
      description: "edit a post",
    });
    expect(await auth.add(permission)).toBeTruthy();

    const rule = new AuthorRule();
    rule.data.reallyReally = true;
    expect(await auth.add(rule)).toBeTruthy();
  });

  test("Get children", async () => {
    const user = new Role({ name: "user" });
    await auth.add(user);
    expect((await auth.getChildren(user.name)).size).toBe(0);

    const changeName = new Permission({ name: "changeName" });
    await auth.add(changeName);
    await auth.addChild(user, changeName);
    expect((await auth.getChildren(user.name)).size).toBe(1);
  });

  test("Get rule", async () => {
    await prepareData(auth);

    let rule = await auth.getRule("isAuthor");
    expect(rule).toBeTruthy();
    expect(rule).toBeInstanceOf(Rule);
    expect(rule?.name).toBe("isAuthor");

    rule = await auth.getRule("nonExisting");
    expect(rule).toBeNull();
  });

  test("Add rule", async () => {
    await prepareData(auth);

    const ruleName = "isReallyReallyAuthor";
    let rule: AuthorRule | null = new AuthorRule();
    rule.name = ruleName;
    rule.data.reallyReally = true;
    await auth.add(rule);

    rule = (await auth.getRule(ruleName)) as AuthorRule | null;
    expect(rule).toBeTruthy();
    expect(rule?.name).toBe(ruleName);
    expect(rule?.data.reallyReally).toBeTruthy();
  });

  test("Update rule", async () => {
    await prepareData(auth);

    let rule = (await auth.getRule("isAuthor")) as AuthorRule;
    rule.name = "newName";
    rule.data.reallyReally = false;
    await auth.update("isAuthor", rule);

    rule = (await auth.getRule("isAuthor")) as AuthorRule;
    expect(rule).toBeNull();

    rule = (await auth.getRule("newName")) as AuthorRule;
    expect(rule.name).toBe("newName");
    expect(rule.data.reallyReally).toBe(false);

    rule.data.reallyReally = true;
    await auth.update("newName", rule);

    rule = (await auth.getRule("newName")) as AuthorRule;
    expect(rule.data.reallyReally).toBe(true);

    let item = (await auth.getPermission("createPost")) as Permission;
    item.name = "new createPost";
    await auth.update("createPost", item);

    item = (await auth.getPermission("createPost")) as Permission;
    expect(item).toBeNull();

    item = (await auth.getPermission("new createPost")) as Permission;
    expect(item.name).toBe("new createPost");
  });

  test("Get rules", async () => {
    await prepareData(auth);

    const rule = new AuthorRule();
    rule.name = "isReallyReallyAuthor";
    rule.data.reallyReally = true;
    await auth.add(rule);

    const rules = await auth.getRules();

    const ruleNames = Array.from(rules.values()).map((rule) => {
      return rule.name;
    });
    expect(ruleNames).toContain("isReallyReallyAuthor");
    expect(ruleNames).toContain("isAuthor");
  });

  test("Remove rule", async () => {
    await prepareData(auth);

    await auth.remove((await auth.getRule("isAuthor"))!);
    const rules = await auth.getRules();
    expect(rules.size).toBe(0);

    await auth.remove((await auth.getPermission("createPost"))!);
    const item = await auth.getPermission("createPost");
    expect(item).toBeNull();
  });

  test("Get permissions by role", async () => {
    await prepareData(auth);

    const permissions = await auth.getPermissionsByRole("admin");
    const expectedPermissions = ["createPost", "updateOwnPost", "readPost", "updatePost"];
    expect(permissions.size).toBe(expectedPermissions.length);
    expectedPermissions.forEach((permissionName) => {
      expect(permissions.get(permissionName)).toBeInstanceOf(Permission);
    });
  });

  test("Get permissions by user", async () => {
    await prepareData(auth);

    const permissions = await auth.getPermissionsByUser("author B");
    const expectedPermissions = ["deletePost", "readPost", "updateOwnPost", "updatePost", "createPost"];
    expect(permissions.size).toBe(expectedPermissions.length);
    expectedPermissions.forEach((permissionName) => {
      expect(permissions.get(permissionName)).toBeInstanceOf(Permission);
    });
  });

  test("Get role", async () => {
    await prepareData(auth);

    const author = await auth.getRole("author");
    expect(author?.type).toBe(ItemType.role);
    expect(author?.name).toBe("author");
    // expect(author?.data).toBe('authorData');
  });

  test("Get permission", async () => {
    await prepareData(auth);

    const createPost = await auth.getPermission("createPost");
    expect(createPost?.type).toBe(ItemType.permission);
    expect(createPost?.name).toBe("createPost");
    // expect(createPost?.data).toBe('createPostData'););
  });

  test("Get roles by user", async () => {
    await prepareData(auth);

    const reader = (await auth.getRole("reader")) as Role;
    await auth.assign(reader, "0");
    await auth.assign(reader, "123");

    let roles = await auth.getRolesByUser("reader");
    expect(roles.get("reader")).toBeInstanceOf(Role);
    expect(roles.get("reader")?.name).toBe("reader");

    roles = await auth.getRolesByUser("0");
    expect(roles.get("reader")).toBeInstanceOf(Role);
    expect(roles.get("reader")?.name).toBe("reader");

    roles = await auth.getRolesByUser("123");
    expect(roles.get("reader")).toBeInstanceOf(Role);
    expect(roles.get("reader")?.name).toBe("reader");

    expect(roles.has("myDefaultRole")).toBe(true);
  });

  test("Get child roles", async () => {
    await prepareData(auth);

    let roles = await auth.getChildRoles("withoutChildren");
    expect(roles.size).toBe(1);
    expect(roles.values().next().value).toBeInstanceOf(Role);
    expect((roles.values().next().value as Role).name).toBe("withoutChildren");

    roles = await auth.getChildRoles("reader");
    expect(roles.size).toBe(1); // 1 ???
    expect(roles.values().next().value).toBeInstanceOf(Role);
    expect((roles.values().next().value as Role).name).toBe("reader");

    roles = await auth.getChildRoles("author");
    expect(roles.size).toBe(2); // 2 ???
    expect(roles.has("author")).toBe(true);
    expect(roles.has("reader")).toBe(true);

    roles = await auth.getChildRoles("admin");
    expect(roles.size).toBe(3); // 3 ???
    expect(roles.has("admin")).toBe(true);
    expect(roles.has("author")).toBe(true);
    expect(roles.has("reader")).toBe(true);
  });

  test("Assign multiple roles", async () => {
    await prepareData(auth);

    const reader = (await auth.getRole("reader")) as Role;
    const author = (await auth.getRole("author")) as Role;
    await auth.assign(reader, "readingAuthor");
    await auth.assign(author, "readingAuthor");

    // auth = createManager();

    const roles = await auth.getRolesByUser("readingAuthor");
    expect(roles.has("reader")).toBe(true);
    expect(roles.has("author")).toBe(true);
  });

  test("Get assignments by role", async () => {
    await prepareData(auth);

    const reader = (await auth.getRole("reader")) as Role;
    await auth.assign(reader, "123");

    // auth = createManager();

    const usersNonExistingRole = await auth.getUsernamesByRole("nonexisting");
    expect(usersNonExistingRole).toHaveLength(0);

    const usersReader = await auth.getUsernamesByRole("reader");
    expect(usersReader).toHaveLength(2);
    expect(usersReader).toContain("reader");
    expect(usersReader).toContain("123");

    const usersAuthor = await auth.getUsernamesByRole("author");
    expect(usersAuthor).toHaveLength(2);
    expect(usersAuthor).toContain("author B");

    const usersAdmin = await auth.getUsernamesByRole("admin");
    expect(usersAdmin).toHaveLength(1);
    expect(usersAdmin).toContain("admin");
  });

  test("Can add child", async () => {
    await prepareData(auth);

    const author = new Role({ name: "author" });
    const reader = new Role({ name: "reader" });

    expect(await auth.canAddChild(author, reader)).toBe(true);
    expect(await auth.canAddChild(reader, author)).toBe(false);
  });

  test("Remove all rules", async () => {
    await prepareData(auth);

    await auth.removeAllRules();

    expect((await auth.getRules()).size).toBe(0);

    expect((await auth.getRoles()).size).toBeGreaterThan(0);
    expect((await auth.getPermissions()).size).toBeGreaterThan(0);
  });

  test("Remove all roles", async () => {
    await prepareData(auth);

    await auth.removeAllRoles();

    expect((await auth.getRoles()).size).toBe(0);

    expect((await auth.getRules()).size).toBeGreaterThan(0);
    expect((await auth.getPermissions()).size).toBeGreaterThan(0);
  });

  test("Remove all permissions", async () => {
    await prepareData(auth);

    await auth.removeAllPermissions();

    expect((await auth.getPermissions()).size).toBe(0);

    expect((await auth.getRules()).size).toBeGreaterThan(0);
    expect((await auth.getRoles()).size).toBeGreaterThan(0);
  });

  test("Assign rule to role", async () => {
    await testAssignRule(ItemType.role);
  });

  test("Assign rule to permission", async () => {
    await testAssignRule(ItemType.permission);
  });

  async function testAssignRule(itemType: ItemType) {
    const username = "3";

    await auth.removeAll();
    let item = createRBACItem(itemType, "Admin");
    await auth.add(item);
    await auth.assign(item, username);
    expect(await auth.checkAccess(username, "Admin", {})).toBe(true);

    // with normal register rule
    await auth.removeAll();
    const rule = new ActionRule();
    await auth.add(rule);
    item = createRBACItem(itemType, "Reader");
    item.ruleName = rule.name;
    await auth.add(item);
    await auth.assign(item, username);
    expect(await auth.checkAccess(username, "Reader", { action: "read" })).toBe(true);
    expect(await auth.checkAccess(username, "Reader", { action: "write" })).toBe(false);

    // update role and rule
    const allRule = new ActionRule();
    allRule.name = "all_rule";
    allRule.data.action = "all";
    await auth.add(allRule);
    item = (await getRBACItem(itemType, "Reader"))!;
    item.name = "AdminPost";
    item.ruleName = "all_rule";
    await auth.update("Reader", item);
    expect(await auth.checkAccess(username, "AdminPost", { action: "print" })).toBe(true);
  }

  test("Revoke rule from role", async () => {
    await testRevokeRule(ItemType.role);
  });

  test("Revoke rule from permission", async () => {
    await testRevokeRule(ItemType.permission);
  });

  async function testRevokeRule(itemType: ItemType) {
    const username = "3";

    await auth.removeAll();
    let item = createRBACItem(itemType, "Admin");
    await auth.add(item);
    await auth.assign(item, username);
    expect(await auth.revoke(item, username)).toBe(true);
    expect(await auth.checkAccess(username, "Admin", {})).toBe(false);

    await auth.removeAll();
    const rule = new ActionRule();
    await auth.add(rule);
    item = createRBACItem(itemType, "Reader");
    item.ruleName = rule.name;
    await auth.add(item);
    await auth.assign(item, username);
    expect(await auth.revoke(item, username)).toBe(true);
    expect(await auth.checkAccess(username, "Reader", { action: "read" })).toBe(false);
    expect(await auth.checkAccess(username, "Reader", { action: "write" })).toBe(false);
  }

  /**
   * Create Role or Permission RBAC item.
   * @param {ItemType} itemType
   * @param {string} name
   * @return {Permission | Role}
   */
  function createRBACItem(itemType: ItemType, name: string): Permission | Role {
    if (itemType === ItemType.role) {
      return new Role({ name });
    }
    if (itemType === ItemType.permission) {
      return new Permission({ name });
    }

    throw new Error("Invalid argument");
  }

  /**
   * Get Role or Permission RBAC item.
   * @param {ItemType} itemType
   * @param {string} name
   * @return {Promise<Permission | Role | null>}
   */
  function getRBACItem(itemType: ItemType, name: string): Promise<Permission | Role | null> {
    if (itemType === ItemType.role) {
      return auth.getRole(name);
    }
    if (itemType === ItemType.permission) {
      return auth.getPermission(name);
    }

    throw new Error("Invalid argument");
  }
});
