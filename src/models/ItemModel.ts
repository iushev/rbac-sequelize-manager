import {
  Model,
  Sequelize,
  DataTypes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyCountAssociationsMixin,
  Association,
} from "sequelize";

import { ItemType } from "@iushev/rbac";

import { RuleModel } from "./RuleModel";
import { ItemChildModel } from "./ItemChildModel";
import { AssignmentModel } from "./AssignmentModel";

export class ItemModel extends Model {
  declare public name: string;
  declare public type: ItemType;
  declare public description: string | null;
  declare public ruleName: string | null;
  declare public data: string | null;

  declare public getRule: BelongsToGetAssociationMixin<RuleModel>;
  declare public setRule: BelongsToSetAssociationMixin<RuleModel, string>;
  declare public readonly rule: RuleModel;

  declare public getParents: BelongsToManyGetAssociationsMixin<ItemModel>;
  declare public setParents: BelongsToManySetAssociationsMixin<ItemModel, number>;
  declare public addParent: BelongsToManyAddAssociationMixin<ItemModel, number>;
  declare public hasParent: BelongsToManyHasAssociationMixin<ItemModel, number>;
  declare public countParents: BelongsToManyCountAssociationsMixin;
  declare public readonly parents: ItemModel[];

  declare public getChildren: BelongsToManyGetAssociationsMixin<ItemModel>;
  declare public setChildren: BelongsToManySetAssociationsMixin<ItemModel, number>;
  declare public addChild: BelongsToManyAddAssociationMixin<ItemModel, number>;
  declare public hasChild: BelongsToManyHasAssociationMixin<ItemModel, number>;
  declare public countChildren: BelongsToManyCountAssociationsMixin;
  declare public readonly children: ItemModel[];

  public get parentNames(): string[] {
    return this.parents.map((parent) => parent.name);
  }

  public static associations: {
    rule: Association<ItemModel, RuleModel>;
    parents: Association<ItemModel, ItemModel>;
    children: Association<ItemModel, ItemModel>;
    assignments: Association<ItemModel, AssignmentModel>;
  };

  public static associate() {
    ItemModel.belongsTo(RuleModel, {
      as: "rule",
      foreignKey: "ruleName",
      targetKey: "name",
    });
    ItemModel.belongsToMany(ItemModel, {
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
    ItemModel.belongsToMany(ItemModel, {
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
    ItemModel.hasMany(AssignmentModel, {
      as: "assignments",
      foreignKey: "itemName",
    });
  }
}

export const attributeDefs = {
  name: {
    type: DataTypes.STRING(64),
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM,
    allowNull: false,
    values: Object.keys(ItemType).map((key) => ItemType[key as keyof typeof ItemType]),
  },
  description: DataTypes.TEXT(),
  ruleName: {
    type: DataTypes.STRING(64),
    references: {
      model: RuleModel,
      key: "name",
    },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  },
  data: DataTypes.TEXT(),
};

export const optionDefs = {
  tableName: "rbac_item",
  underscored: true,
};

export default (sequelize: Sequelize): typeof ItemModel => {
  ItemModel.init(attributeDefs, {
    ...optionDefs,
    sequelize,
  });
  return ItemModel;
};
