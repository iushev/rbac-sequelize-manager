import { Sequelize, Association } from "sequelize/types";

import { ItemType } from "@iushev/rbac";

import { ItemModel, attributeDefs, optionDefs } from "./ItemModel";
import { RuleModel } from "./RuleModel";
import { ItemChildModel } from "./ItemChildModel";
import { AssignmentModel } from "./AssignmentModel";

export class PermissionModel extends ItemModel {
  public static readonly associations: {
    rule: Association<PermissionModel, RuleModel>;
    parents: Association<PermissionModel, ItemModel>;
    children: Association<PermissionModel, ItemModel>;
    assignments: Association<PermissionModel, AssignmentModel>;
  };

  public static associate() {
    PermissionModel.belongsTo(RuleModel, {
      as: "rule",
      foreignKey: "ruleName",
      targetKey: "name",
    });
    PermissionModel.belongsToMany(ItemModel, {
      as: {
        singular: "parent",
        plural: "parents",
      },
      through: ItemChildModel,
      sourceKey: "name", // into Item
      foreignKey: "childName", // into ItemChild
      otherKey: "parentName", // into ItemChild
      targetKey: "name", // into Item (child)
    });
    PermissionModel.belongsToMany(ItemModel, {
      as: {
        singular: "child",
        plural: "children",
      },
      through: ItemChildModel,
      sourceKey: "name", // into Item
      foreignKey: "parentName", // into ItemChild
      otherKey: "childName", // into ItemChild
      targetKey: "name", // into Item (child)
    });
    PermissionModel.hasMany(AssignmentModel, {
      as: "assignments",
      foreignKey: "itemName",
    });
  }
}

export default (sequelize: Sequelize): typeof PermissionModel => {
  PermissionModel.init(
    {
      ...attributeDefs,
      type: {
        ...attributeDefs.type,
        defaultValue: ItemType.permission,
      },
    },
    {
      ...optionDefs,
      sequelize,
      defaultScope: {
        where: {
          type: ItemType.permission,
        },
      },
    },
  );

  return PermissionModel;
};
