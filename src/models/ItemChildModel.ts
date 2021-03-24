import {
  Model,
  Sequelize,
  DataTypes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
} from "sequelize";

import { ItemModel } from "./ItemModel";

export class ItemChildModel extends Model {
  public parentName!: string;
  public childName!: string;

  public getParent!: BelongsToGetAssociationMixin<ItemModel>;
  public setParent!: BelongsToSetAssociationMixin<ItemModel, string>;
  public readonly parent!: ItemModel;

  public getChild!: BelongsToGetAssociationMixin<ItemModel>;
  public setChild!: BelongsToSetAssociationMixin<ItemModel, string>;
  public readonly child!: ItemModel;

  public static associate() {
    ItemChildModel.belongsTo(ItemModel, {
      as: "parent",
      foreignKey: "parentName",
    });
    ItemChildModel.belongsTo(ItemModel, {
      as: "child",
      foreignKey: "childName",
    });
  }
}

export default (sequelize: Sequelize): typeof ItemChildModel => {
  ItemChildModel.init(
    {
      parentName: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
        references: {
          model: ItemModel,
          key: "name",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      childName: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
        references: {
          model: ItemModel,
          key: "name",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    {
      sequelize,
      tableName: "rbac_item_child",
      underscored: true,
      timestamps: false,
    }
  );

  return ItemChildModel;
};
