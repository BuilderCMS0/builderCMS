// const _ = require('lodash');
// const MESSAGE = require('../config/message').message;
// const { Permission } = require('../models/index');

// const permission = (page, action) => async (req, res, next) => {
//     try{
//         if(req.user && req.user.permissionId){
//             // req.user.permissionId = req.user.permissionId.toString();
//             let userPermission = await Permission.findOne({ _id: req.user.permissionId });
//             if (!userPermission && !userPermission.permissions) {
//                 return res.badRequest({}, MESSAGE.FORBIDDEN);
//             }
//             const validPermission = _.find(userPermission.permissions, { moduleNum: page });
//             if (!validPermission || !validPermission.permissions[action]) {
//                 return res.badRequest({}, MESSAGE.FORBIDDEN);
//             }
//             return next();
//         }else{
//             return res.badRequest({}, MESSAGE.FORBIDDEN);
//         }
//     }catch(error){
//         return res.badRequest({}, MESSAGE.FORBIDDEN);
//     }
// };

// module.exports = permission;
