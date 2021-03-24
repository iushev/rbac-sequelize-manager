import { Sequelize, Association } from "sequelize/types";

import { ItemType } from "@iushev/rbac";

import { ItemModel, attributeDefs, optionDefs } from "./ItemModel";
import { RuleModel } from "./RuleModel";
import { ItemChildModel } from "./ItemChildModel";
import { AssignmentModel } from "./AssignmentModel";

export class RoleModel extends ItemModel {
  public static associations: {
    rule: Association<RoleModel, RuleModel>;
    parents: Association<RoleModel, ItemModel>;
    children: Association<RoleModel, ItemModel>;
    assignments: Association<RoleModel, AssignmentModel>;
  };

  public static associate() {
    RoleModel.belongsTo(RuleModel, {
      as: "rule",
      foreignKey: "ruleName",
      targetKey: "name",
    });
    RoleModel.belongsToMany(ItemModel, {
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
    RoleModel.belongsToMany(ItemModel, {
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
    RoleModel.hasMany(AssignmentModel, {
      as: "assignments",
      foreignKey: "itemName",
    });
  }
}

export default (sequelize: Sequelize): typeof RoleModel => {
  RoleModel.init(
    {
      ...attributeDefs,
      type: {
        ...attributeDefs.type,
        defaultValue: ItemType.role,
      },
    },
    {
      ...optionDefs,
      sequelize,
      defaultScope: {
        where: {
          type: ItemType.role,
        },
      },
    }
  );

  return RoleModel;
};
