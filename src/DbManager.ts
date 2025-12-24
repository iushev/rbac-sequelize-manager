import { Sequelize, Op } from "sequelize";

import {
  IItem as RbacItem,
  Role as RbacRole,
  Permission as RbacPermission,
  ItemType as RbacItemType,
  ItemType,
  Rule as RbacRule,
  Assignment as RbacAssignment,
  BaseManager,
  BaseManagerOptions,
} from "@iushev/rbac";

import initModels, {
  ItemModel,
  RuleModel,
  RoleModel,
  PermissionModel,
  ItemChildModel,
  AssignmentModel,
} from "./models";

export interface DbManagerOptions extends BaseManagerOptions {
  sequelize: Sequelize;
}

export default class DbManager extends BaseManager {
  private sequelize: Sequelize;

  constructor(options: DbManagerOptions) {
    super(options);

    if (!options.sequelize) {
      throw new Error("Database connection is required");
    }

    this.sequelize = options.sequelize;
    initModels(this.sequelize);
  }

  /**
   * @inheritdoc
   */
  public async load(): Promise<void> {
    this.log("DbManager: Loading RBAC.");
    const data = await Promise.all([
      ItemModel.findAll({
        include: [
          {
            association: ItemModel.associations.parents,
            attributes: ["name"],
          },
        ],
      }),
      RuleModel.findAll(),
    ]);

    const [items, rules] = data;

    this.items = items.reduce<Map<string, RbacItem>>((prevValue, item) => {
      const ItemClass = item.type === ItemType.role ? RbacRole : RbacPermission;
      const rbacItem = new ItemClass({
        name: item.name,
        description: item.description,
        ruleName: item.ruleName,
        data: item.data,
      });

      prevValue.set(item.name, rbacItem);
      return prevValue;
    }, new Map());

    this.parents = items.reduce<Map<string, Map<string, RbacItem>>>((prevValue, item) => {
      prevValue.set(
        item.name,
        new Map(
          item.parents.reduce((itemParents, parent) => {
            itemParents.set(parent.name, this.items.get(parent.name));
            return itemParents;
          }, new Map()),
        ),
      );
      return prevValue;
    }, new Map());

    this.rules = rules.reduce<Map<string, RbacRule>>((prevValue, rule) => {
      const ruleData = JSON.parse(rule.data);
      const RuleClass = this.ruleClasses.get(ruleData.typeName) ?? RbacRule;
      const rbacRule = new RuleClass(rule.name, JSON.parse(ruleData.ruleData));

      prevValue.set(rule.name, rbacRule);
      return prevValue;
    }, new Map());
  }

  /**
   * @inheritdoc
   */
  public async getRolesByUser(username: string): Promise<Map<string, RbacRole>> {
    const roles = await RoleModel.findAll({
      include: [
        RoleModel.associations.parents,
        {
          association: RoleModel.associations.assignments,
          attributes: [],
          where: {
            username,
          },
        },
      ],
    });

    return roles.reduce<Map<string, RbacRole>>((prevValue, role) => {
      const rbacRole = new RbacRole({
        name: role.name,
        description: role.description,
        ruleName: role.ruleName,
        data: role.data,
      });

      prevValue.set(role.name, rbacRole);
      return prevValue;
    }, this.getDefaultRoleInstances());
  }

  /**
   * @inheritdoc
   */
  public async getChildRoles(roleName: string): Promise<Map<string, RbacRole>> {
    const role = await this.getRole(roleName);

    if (role === null) {
      throw new Error(`Role "${roleName}" not found.`);
    }

    const result: Map<string, true> = new Map();
    this.getChildrenRecursive(roleName, await this.getChildrenList(), result);

    const roles: Map<string, RbacRole> = new Map([[roleName, role]]);

    (await this.getRoles()).forEach((value, key) => {
      if (result.has(key)) {
        roles.set(key, value);
      }
    });

    return roles;
  }

  /**
   * @inheritdoc
   */
  public async getPermissionsByRole(roleName: string): Promise<Map<string, RbacPermission>> {
    const result: Map<string, true> = new Map();
    this.getChildrenRecursive(roleName, await this.getChildrenList(), result);
    const permissions = await PermissionModel.findAll({
      where: {
        name: {
          [Op.in]: [...result.keys()],
        },
      },
      include: [PermissionModel.associations.parents],
    });

    return permissions.reduce<Map<string, RbacPermission>>((prevValue, permission) => {
      const rbacPermission = new RbacPermission({
        name: permission.name,
        description: permission.description,
        ruleName: permission.ruleName,
        data: permission.data,
      });

      prevValue.set(permission.name, rbacPermission);
      return prevValue;
    }, new Map());
  }

  /**
   * @inheritdoc
   */
  public async getPermissionsByUser(username: string): Promise<Map<string, RbacPermission>> {
    if (!username) {
      return new Map();
    }

    const directPermission = await this.getDirectPermissionsByUser(username);
    const inheritedPermission = await this.getInheritedPermissionsByUser(username);

    return new Map([...directPermission, ...inheritedPermission]);
  }

  /**
   * @inheritdoc
   */
  public async getRule(name: string): Promise<RbacRule | null> {
    const rule = await RuleModel.findByPk(name);
    if (!rule) {
      return null;
    }

    const data = JSON.parse(rule.data);
    const RuleClass = this.ruleClasses.get(data.typeName) ?? RbacRule;
    return new RuleClass(rule.name, JSON.parse(data.ruleData));
  }

  /**
   * @inheritdoc
   */
  public async getRules(): Promise<Map<string, RbacRule>> {
    const rules = await RuleModel.findAll();
    return rules.reduce<Map<string, RbacRule>>((prevValue, rule) => {
      const data = JSON.parse(rule.data);
      const RuleClass = this.ruleClasses.get(data.typeName) ?? RbacRule;
      const rbacRule = new RuleClass(rule.name, JSON.parse(data.ruleData));

      prevValue.set(rule.name, rbacRule);
      return prevValue;
    }, new Map());
  }

  /**
   * @inheritdoc
   */
  public async canAddChild(parent: RbacItem, child: RbacItem): Promise<boolean> {
    return !(await this.detectLoop(parent, child));
  }

  /**
   * @inheritdoc
   */
  public async addChild(parent: RbacItem, child: RbacItem): Promise<boolean> {
    if (parent.name === child.name) {
      throw new Error(`Cannot add '${parent.name}' as a child of itself.`);
    }

    if (parent instanceof RbacPermission && child instanceof RbacRole) {
      throw new Error("Cannot add a role as a child of a permission.");
    }

    const detectedLoop = await this.detectLoop(parent, child);
    if (detectedLoop) {
      throw new Error(`Cannot add '${child.name}' as a child of '${parent.name}'. A loop has been detected.`);
    }

    await ItemChildModel.create({
      parentName: parent.name,
      childName: child.name,
    });

    this.invalidateRbac();
    return true;
  }

  /**
   * @inheritdoc
   */
  public async removeChild(parent: RbacItem, child: RbacItem): Promise<boolean> {
    const result = await ItemChildModel.destroy({
      where: {
        parentName: parent.name,
        childName: child.name,
      },
    });

    this.invalidateRbac();
    return result > 0;
  }

  /**
   * @inheritdoc
   */
  public async removeChildren(parent: RbacItem): Promise<boolean> {
    const result = await ItemChildModel.destroy({
      where: {
        parentName: parent.name,
      },
    });

    this.invalidateRbac();
    return result > 0;
  }

  /**
   * @inheritdoc
   */
  public async hasChild(parent: RbacItem, child: RbacItem): Promise<boolean> {
    const count = await ItemChildModel.count({
      where: {
        parentName: parent.name,
        childName: child.name,
      },
    });

    return count > 0;
  }

  /**
   * @inheritdoc
   */
  public async getChildren(name: string): Promise<Map<string, RbacItem>> {
    const items = await ItemModel.findAll({
      include: [
        {
          association: ItemModel.associations.parents,
          where: {
            name,
          },
        },
      ],
    });

    return items.reduce<Map<string, RbacItem>>((prevValue, item) => {
      const ItemClass = item.type === ItemType.role ? RbacRole : RbacPermission;
      const rbacItem = new ItemClass({
        name: item.name,
        description: item.description,
        ruleName: item.ruleName,
        data: item.data,
      });

      prevValue.set(item.name, rbacItem);
      return prevValue;
    }, new Map());
  }

  /**
   * @inheritdoc
   */
  public async assign(role: RbacRole | RbacPermission, username: string): Promise<RbacAssignment> {
    const assignment = await AssignmentModel.create({
      itemName: role.name,
      username,
    });

    return new RbacAssignment(assignment.username, assignment.itemName);
  }

  /**
   * @inheritdoc
   */
  public async revoke(role: RbacRole | RbacPermission, username: string): Promise<boolean> {
    const result = await AssignmentModel.destroy({
      where: {
        itemName: role.name,
        username,
      },
    });

    return result > 0;
  }

  /**
   * @inheritdoc
   */
  public async revokeAll(username: string): Promise<boolean> {
    const result = await AssignmentModel.destroy({
      where: {
        username,
      },
    });

    return result > 0;
  }

  /**
   * @inheritdoc
   */
  public async getAssignment(roleName: string, username: string): Promise<RbacAssignment | null> {
    const assignment = await AssignmentModel.findOne({
      where: {
        username,
        itemName: roleName,
      },
    });
    if (!assignment) {
      return null;
    }

    return new RbacAssignment(assignment.username, assignment.itemName);
  }

  /**
   * @inheritdoc
   */
  public async getAssignments(username: string): Promise<Map<string, RbacAssignment>> {
    const assignments = await AssignmentModel.findAll({
      where: {
        username,
      },
    });

    return assignments.reduce<Map<string, RbacAssignment>>((prevValue, assignment) => {
      const rbacAssignment = new RbacAssignment(assignment.username, assignment.itemName);
      prevValue.set(assignment.itemName, rbacAssignment);
      return prevValue;
    }, new Map());
  }

  /**
   * @inheritdoc
   */
  public async getUsernamesByRole(roleName: string): Promise<string[]> {
    if (!roleName) {
      return [];
    }

    const assignments = await AssignmentModel.findAll({
      where: {
        itemName: roleName,
      },
    });

    return assignments.map((assignment) => assignment.username);
  }

  /**
   * @inheritdoc
   */
  public async removeAll(): Promise<void> {
    await AssignmentModel.destroy({ where: {} });
    await ItemChildModel.destroy({ where: {} });
    await ItemModel.destroy({ where: {} });
    await RuleModel.destroy({ where: {} });
    this.invalidateRbac();
  }

  /**
   * @inheritdoc
   */
  public async removeAllPermissions(): Promise<void> {
    await PermissionModel.destroy({ where: {} });
    this.invalidateRbac();
  }

  /**
   * @inheritdoc
   */
  public async removeAllRoles(): Promise<void> {
    await RoleModel.destroy({ where: {} });
    this.invalidateRbac();
  }

  /**
   * @inheritdoc
   */
  public async removeAllRules(): Promise<void> {
    await RuleModel.destroy({ where: {} });
    this.invalidateRbac();
  }

  /**
   * @inheritdoc
   */
  public async removeAllAssignments(): Promise<void> {
    await AssignmentModel.destroy({ where: {} });
    this.invalidateRbac();
  }

  /**
   * @inheritdoc
   */
  public async getItem(name: string): Promise<RbacItem | null> {
    const item = await ItemModel.findByPk(name, {
      include: [ItemModel.associations.parents],
    });

    if (!item) {
      return null;
    }

    const ItemClass = item.type == RbacItemType.role ? RbacRole : RbacPermission;
    return new ItemClass({
      name: item.name,
      description: item.description,
      ruleName: item.ruleName,
      data: item.data,
    });
  }

  /**
   * @inheritdoc
   */
  public async getItems(type: RbacItemType): Promise<Map<string, RbacItem>> {
    const items = await ItemModel.findAll({
      where: {
        type,
      },
      include: [ItemModel.associations.parents],
    });

    return items.reduce<Map<string, RbacItem>>((prevValue, item) => {
      const ItemClass = type == RbacItemType.role ? RbacRole : RbacPermission;
      const rbacItem = new ItemClass({
        name: item.name,
        description: item.description,
        ruleName: item.ruleName,
        data: item.data,
      });

      prevValue.set(item.name, rbacItem);
      return prevValue;
    }, new Map());
  }

  /**
   * @inheritdoc
   */
  public async addItem(item: RbacItem): Promise<boolean> {
    await ItemModel.create({
      name: item.name,
      type: item.type,
      description: item.description,
      ruleName: item.ruleName,
    });
    this.invalidateRbac();
    return true;
  }

  /**
   * @inheritdoc
   */
  public async addRule(rbacRule: RbacRule): Promise<boolean> {
    const rule = RuleModel.build({
      name: rbacRule.name,
      data: JSON.stringify({
        typeName: rbacRule.constructor.name,
        ruleData: JSON.stringify(rbacRule.data),
      }),
    });
    await rule.save();

    this.invalidateRbac();
    return true;
  }

  /**
   * @inheritdoc
   */
  public async removeItem(item: RbacItem): Promise<boolean> {
    await ItemModel.destroy({
      where: {
        name: item.name,
      },
    });
    this.invalidateRbac();
    return true;
  }

  /**
   * @inheritdoc
   */
  public async removeRule(rule: RbacRule): Promise<boolean> {
    await RuleModel.destroy({
      where: {
        name: rule.name,
      },
    });
    this.invalidateRbac();
    return true;
  }

  /**
   * @inheritdoc
   */
  public async updateItem(name: string, item: RbacItem): Promise<boolean> {
    await ItemModel.update(
      {
        name: item.name,
        type: item.type,
        description: item.description,
        ruleName: item.ruleName,
      },
      {
        where: {
          name,
        },
      },
    );
    this.invalidateRbac();
    return true;
  }

  /**
   * @inheritdoc
   */
  public async updateRule(name: string, rbacRule: RbacRule): Promise<boolean> {
    await RuleModel.update(
      {
        name: rbacRule.name,
        data: JSON.stringify({
          typeName: rbacRule.constructor.name,
          ruleData: JSON.stringify(rbacRule.data),
        }),
      },
      {
        where: {
          name,
        },
      },
    );

    this.invalidateRbac();
    return true;
  }

  /**
   * Checks whether there is a loop in the authorization item hierarchy.
   * @param {RbacItem} parent the parent item
   * @param {RbacItem} child the child item to be added to the hierarchy
   * @return {Promise<boolean>} whether a loop exists
   */
  protected async detectLoop(parent: RbacItem, child: RbacItem): Promise<boolean> {
    if (child.name === parent.name) {
      return true;
    }

    const children = await this.getChildren(child.name);

    for (const value of children.values()) {
      if (await this.detectLoop(parent, value)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns the children for every parent.
   * @return {Promise<{ [key: string]: string[] }> } the children list. Each array key is a parent item name,
   * and the corresponding array value is a list of child item names.
   */
  protected async getChildrenList(): Promise<Map<string, string[]>> {
    const rows = await ItemChildModel.findAll();
    return rows.reduce<Map<string, string[]>>((parents, row) => {
      if (!parents.has(row.parentName)) {
        parents.set(row.parentName, [row.childName]);
      } else {
        parents.get(row.parentName)?.push(row.childName);
      }

      return parents;
    }, new Map());
  }

  /**
   * Recursively finds all children and grand children of the specified item.
   * @param {string} name the name of the item whose children are to be looked for.
   * @param {{ [key: string]: string[] }} childrenList the child list built via getChildrenList()
   * @param {{ [key: string]: true }} result the children and grand children (in array keys)
   */
  protected getChildrenRecursive(name: string, childrenList: Map<string, string[]>, result: Map<string, true>) {
    const children = childrenList.get(name);
    if (!children) {
      return;
    }

    for (const child of children) {
      result.set(child, true);
      this.getChildrenRecursive(child, childrenList, result);
    }
  }

  /**
   * Returns all permissions that are directly assigned to user.
   * @param {string} username the username
   * @return {Promise<Map<string, Permission>} all direct permissions that the user has. The array is indexed by the permission names.
   */
  protected async getDirectPermissionsByUser(username: string): Promise<Map<string, RbacPermission>> {
    const permissions = await PermissionModel.findAll({
      include: [
        {
          association: ItemModel.associations.assignments,
          where: {
            username,
          },
        },
      ],
    });

    return permissions.reduce<Map<string, RbacPermission>>((prevValue, permission) => {
      prevValue.set(
        permission.name,
        new RbacPermission({
          name: permission.name,
          description: permission.description,
          ruleName: permission.ruleName,
          data: permission.data,
        }),
      );
      return prevValue;
    }, new Map());
  }

  /**
   * Returns all permissions that the user inherits from the roles assigned to him.
   * @param {string} username the username
   * @return {Promise<Map<string, Permission>>} all inherited permissions that the user has.
   */
  protected async getInheritedPermissionsByUser(username: string): Promise<Map<string, RbacPermission>> {
    const assignments = await AssignmentModel.findAll({
      where: {
        username,
      },
    });

    const childrenList = await this.getChildrenList();
    const result: Map<string, true> = new Map();
    for (const role of assignments) {
      this.getChildrenRecursive(role.itemName, childrenList, result);
    }

    const permissions = await PermissionModel.findAll({
      where: {
        name: {
          [Op.in]: [...result.keys()],
        },
      },
    });

    return permissions.reduce<Map<string, RbacPermission>>((prevValue, permission) => {
      prevValue.set(
        permission.name,
        new RbacPermission({
          name: permission.name,
          description: permission.description,
          ruleName: permission.ruleName,
          data: permission.data,
        }),
      );
      return prevValue;
    }, new Map());
  }
}
