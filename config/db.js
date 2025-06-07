const mysql = require("mysql");
const util = require("util");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "cong_thuc_nau_an",
});

connection.connect((err) => {
  if (err) console.error("Lỗi kết nối MySQL:", err);
  else console.log("Đã kết nối MySQL");
});

module.exports = {
  connection,
  query: util.promisify(connection.query).bind(connection),
};