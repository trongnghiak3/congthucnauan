const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const indexRoutes = require("./Routes/index");
const authRoutes =  require("./Routes/auth");
const profileRoutes =  require("./Routes/profile");
const adminRoutes = require("./Routes/admin");
const methodOverride = require('method-override');
const app = express();
const port = 4000;
const ejs = require('ejs');



// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.json());

app.use('/uploads', express.static('uploads'));
app.use('/build', express.static('build'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "motChuoiBiMatNgauNhien123!",
  resave: false,
  saveUninitialized: false,
}));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);
// Trong app.js hoặc file cấu hình Express


ejs.delimiter = '%'; // Đảm bảo sử dụng <% %>
app.locals.escapeJs = function (str) {
  if (typeof str !== 'string') {
    str = str == null ? '' : str.toString();
  }
  return str
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
};

app.use("/", indexRoutes);
app.use("/", authRoutes);
app.use("/", profileRoutes);
app.use("/", adminRoutes);

app.listen(port, () => {
  console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
});