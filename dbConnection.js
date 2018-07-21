const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
const db = mongoose.connection;

const linksSchema = mongoose.Schema({
  user: String,
  channel: String,
  url: String
});
const Links = mongoose.model('Links', linksSchema);

const recordsSchema = mongoose.Schema({
  realm: String,
  user: String,
  channel: String,
  url: String,
  tags: Array,
  ts: String,
  likesCount: Number,
  created: Date
});
const Records = mongoose.model('Records', recordsSchema);

const likeSchema = mongoose.Schema({
  ts: String,
  username: String,
  created: Date
});
const Likes = mongoose.model('Likes', likeSchema);

const roleSchema = mongoose.Schema({
  name: String,
  created: Date,
  modified: Date,
});
const Roles = mongoose.model('Roles', roleSchema);

const roleMappingSchema = mongoose.Schema({
  principalType: String,
  principalId: mongoose.Schema.Types.ObjectId,
  roleId: mongoose.Schema.Types.Mixed
});
const RoleMapping = mongoose.model('RoleMapping', roleMappingSchema);

const userSchema = mongoose.Schema({
  username: String,
  password: String,
  email: String,
  role: String
},
{ collection: 'user' });

const user = mongoose.model('user', userSchema);
module.exports = {
  db,
  Links,
  Records,
  Likes,
  Roles,
  RoleMapping,
  user
};
