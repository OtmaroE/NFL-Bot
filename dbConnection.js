const mongoose = require('mongoose');
mongoose.connect('mongodb://otmarolink:pa55w0rd@ds239681.mlab.com:39681/links', { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', () =>{
  console.log('connection stablished!');
})
const linksSchema = mongoose.Schema({
  user: String,
  channel: String,
  url: String
});
const Links = mongoose.model('Links', linksSchema);

const recordsSchema = mongoose.Schema({
  user: String,
  channel: String,
  url: String,
  tags: Array,
  created: Date
});
const Records = mongoose.model('Records', recordsSchema);

module.exports = {
  Links,
  Records
};
