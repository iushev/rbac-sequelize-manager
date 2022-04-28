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
  public declare name: string;
  public declare type: ItemType;
  public declare description: string | null;
  public declare ruleName: string | null;
  public declare data: string | null;

  public declare getRule: BelongsToGetAssociationMixin<RuleModel>;
  public declare setRule: BelongsToSetAssociationMixin<RuleModel, string>;
  public declare readonly rule: RuleModel;

  public declare getParents: BelongsToManyGetAssociationsMixin<ItemModel>;
  public declare setParents: BelongsToManySetAssociationsMixin<ItemModel, number>;
  public declare addParent: BelongsToManyAddAssociationMixin<ItemModel, number>;
  public declare hasParent: BelongsToManyHasAssociationMixin<ItemModel, number>;
  public declare countParents: BelongsToManyCountAssociationsMixin;
  public declare readonly parents: ItemModel[];

  public declare getChildren: BelongsToManyGetAssociationsMixin<ItemModel>;
  public declare setChildren: BelongsToManySetAssociationsMixin<ItemModel, number>;
  public declare addChild: BelongsToManyAddAssociationMixin<ItemModel, number>;
  public declare hasChild: BelongsToManyHasAssociationMixin<ItemModel, number>;
  public declare countChildren: BelongsToManyCountAssociationsMixin;
  public declare readonly children: ItemModel[];

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
