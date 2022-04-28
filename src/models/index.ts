import { Sequelize, ModelStatic, Model } from "sequelize";

import ruleModelInit from "./RuleModel";
import itemModelInit from "./ItemModel";
import itemChildModelInit from "./ItemChildModel";
import roleModelInit from "./RoleModel";
import permissionModelInit from "./PermissionModel";
import assignmentModelInit from "./AssignmentModel";

export default (sequelize: Sequelize) => {
  const models: ModelStatic<Model>[] = [];

  models.push(ruleModelInit(sequelize));
  models.push(itemModelInit(sequelize));
  models.push(itemChildModelInit(sequelize));
  models.push(roleModelInit(sequelize));
  models.push(permissionModelInit(sequelize));
  models.push(assignmentModelInit(sequelize));

  models.forEach((model) => {
    const _model = model as ModelStatic<Model> & {
      associate?: () => void;
    };

    if (_model.associate) {
      _model.associate();
    }
  });
};

export { RuleModel } from "./RuleModel";
export { ItemModel } from "./ItemModel";
export { RoleModel } from "./RoleModel";
export { PermissionModel } from "./PermissionModel";
export { ItemChildModel } from "./ItemChildModel";
export { AssignmentModel } from "./AssignmentModel";
