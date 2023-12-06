var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var express = require("express");
var cors = require("cors");
var bcrypt = require("bcryptjs");
var multer = require("multer");
var session = require("express-session");
var pg = require("pg");
var pgSession = require("connect-pg-simple")(session);
require("dotenv").config();
var app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
    credentials: true,
    origin: "https://warden-finance.vercel.app"
}));
var saltRounds = 5;
function getYearMonth() {
    var currentTime = new Date();
    var year = currentTime.getFullYear();
    var month = String(currentTime.getMonth() + 1).padStart(2, '0');
    return "".concat(year, "/").concat(month);
}
var connectionString = process.env.DB_CONNECTION_STRING;
var pool = new pg.Pool({ connectionString: connectionString });
app.use(session({
    store: new pgSession({
        pool: pool
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        sameSite: "none",
        httpOnly: false,
        secure: true,
        maxAge: 3600000,
    },
}));
try {
    pool.connect();
    var query = "CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, email VARCHAR(100), password text, picture BYTEA);";
    pool.query(query).catch(function (err) { return console.log(err); });
    pool.query("CREATE TABLE IF NOT EXISTS session (\n        sid VARCHAR NOT NULL PRIMARY KEY,\n        sess JSON NOT NULL,\n        expire TIMESTAMPTZ NOT NULL\n      );").catch(function (err) { return console.log(err); });
    pool.query("CREATE TABLE IF NOT EXISTS months (\n        id serial PRIMARY KEY,\n        email VARCHAR(100),\n        year_month VARCHAR(12),\n        food NUMERIC(14,2),\n        bills NUMERIC(14,2),\n        entertainment NUMERIC(14,2),\n        transportation NUMERIC(14,2),\n        personal_care NUMERIC(14,2),\n        shopping NUMERIC(14,2),\n        other NUMERIC(14,2),\n        max_budget NUMERIC(14,2));")
        .catch(function (err) { return console.log(err); });
    pool.query("CREATE TABLE IF NOT EXISTS budgets (\n        id serial PRIMARY KEY,\n        email VARCHAR(100),\n        year_month VARCHAR(12),\n        food NUMERIC(14,2),\n        bills NUMERIC(14,2),\n        entertainment NUMERIC(14,2),\n        transportation NUMERIC(14,2),\n        personal_care NUMERIC(14,2),\n        shopping NUMERIC(14,2),\n        other NUMERIC(14,2)\n    )")
        .catch(function (err) { return console.log(err); });
}
catch (error) {
    console.log(error);
}
function createCurrentMonth(email) {
    pool.query("SELECT * FROM months WHERE email = $1 AND year_month = $2", [email, getYearMonth()], function (err, result) {
        if (err) {
            console.log(err);
        }
        if (result.rows.length < 1) {
            pool.query("INSERT INTO months(\n                email,\n                year_month,\n                food,\n                bills,\n                entertainment,\n                transportation,\n                personal_care,\n                shopping,\n                other,\n                max_budget) VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0)", [email, getYearMonth()], function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}
function createBudget(email) {
    pool.query("SELECT * FROM budgets WHERE email = $1 AND year_month = $2", [email, getYearMonth()], function (err, result) {
        if (!result.rows.length) {
            pool.query("INSERT INTO budgets (\n                email,\n                year_month,\n                food,\n                bills,\n                entertainment,\n                transportation,\n                personal_care,\n                shopping,\n                other) VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0)", [email, getYearMonth()], function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}
app.get("/check-auth", function (req, res) {
    if (req.session.authenticated && req.session.username) {
        pool.query("SELECT * FROM users WHERE email = $1", [req.session.username], function (err, result) {
            if (result.rows.length > 0) {
                var data = result.rows[0];
                res.status(200).json({ email: req.session.username, picture: data.picture });
            }
        });
    }
    else {
        res.status(401).json("Unauthorized");
    }
});
app.get("/dashboard", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var email, yearMonth, query, resData_1;
    return __generator(this, function (_a) {
        email = String(req.session.username);
        yearMonth = getYearMonth();
        if (req.session.authenticated && email) {
            query = {
                text: "SELECT * FROM months WHERE email = $1 AND year_month = $2",
                values: [email, yearMonth]
            };
            resData_1 = {
                date: "",
                monthData: [],
                budgetData: [],
                maxBudget: 0,
                pastMonths: [],
                image: new Blob
            };
            pool.query(query, function (err, result) {
                if (result.rows.length > 0) {
                    var data = result.rows[0];
                    resData_1.date = yearMonth;
                    resData_1.monthData = [
                        parseFloat(data.food),
                        parseFloat(data.bills),
                        parseFloat(data.entertainment),
                        parseFloat(data.transportation),
                        parseFloat(data.personal_care),
                        parseFloat(data.shopping),
                        parseFloat(data.other),
                    ];
                }
            });
            pool.query("SELECT * FROM budgets WHERE email = $1 AND year_month = $2", [email, getYearMonth()], function (err, result) {
                if (result.rows.length > 0) {
                    var data = result.rows[0];
                    resData_1.budgetData = [
                        parseFloat(data.food),
                        parseFloat(data.bills),
                        parseFloat(data.entertainment),
                        parseFloat(data.transportation),
                        parseFloat(data.personal_care),
                        parseFloat(data.shopping),
                        parseFloat(data.other)
                    ];
                    resData_1.maxBudget = parseFloat(data.max_budget);
                }
            });
            pool.query("SELECT * FROM months WHERE email = $1", [email], function (err, result) {
                if (err) {
                    res.status(500).json("Server Error");
                }
                if (result.rows.length > 0) {
                    var monthArr = result.rows.map(function (row) { return (__assign({}, row)); });
                    resData_1.pastMonths = monthArr;
                    console.log(res.data);
                }
            });
            pool.query("SELECT * FROM users WHERE email = $1", [email], function (err, result) {
                if (result.rows.length > 0) {
                    var data = result.rows[0];
                    resData_1.image = data.picture;
                    res.json(resData_1);
                }
                else {
                    res.json(resData_1);
                }
            });
        }
        else {
            res.status(401).json([]);
        }
        return [2 /*return*/];
    });
}); });
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
app.post("/upload-picture", upload.single("imageData"), function (req, res) {
    console.log("uploading picture");
    var email = req.session.username;
    var imageData = req.file.buffer;
    console.log("ImageData: " + imageData);
    if (email && req.session.authenticated) {
        pool.query("UPDATE users SET picture = $1 WHERE email = $2", [imageData, email], function (err, result) {
            if (err) {
                console.log(err);
                res.status(500).json("server error");
            }
            else {
                res.status(200).json("Success");
            }
        });
    }
    else {
        res.status(401).json("Unauthorized");
    }
});
app.get("/get-budgets", function (req, res) {
    var email = req.session.username;
    if (email && req.session.authenticated) {
        pool.query("SELECT * FROM budgets WHERE email = $1 AND year_month = $2", [email, getYearMonth()], function (err, result) {
            if (err) {
                console.log(err);
            }
            if (result.rows.length > 0) {
                var data = result.rows[0];
                var resData = [
                    data.food,
                    data.bills,
                    data.entertainment,
                    data.transportation,
                    data.personal_care,
                    data.shopping,
                    data.other
                ];
                res.status(200).json(resData);
            }
        });
    }
    else {
        res.status(401).json("Unauthorized");
    }
});
app.post("/set-budget", function (req, res) {
    var email = req.session.username;
    var budgets = req.body;
    if (email && req.session.authenticated) {
        pool.query("UPDATE budgets SET\n            food = $1,\n            bills = $2,\n            entertainment = $3,\n            transportation = $4,\n            personal_care = $5,\n            shopping = $6,\n            other = $7\n            WHERE email = $8 AND year_month = $9", [budgets.food, budgets.bills, budgets.entertainment, budgets.transportation, budgets.personal,
            budgets.shopping, budgets.other, email, getYearMonth()], function (err) {
            if (err) {
                res.status(500).json("Server Error");
            }
        });
    }
    else {
        res.status(401).json("Unauthorized");
    }
});
app.post("/transaction", function (req, res) {
    var categoryIndex = req.body.category;
    var amount = req.body.amount;
    var yearMonth = getYearMonth();
    var email = req.session.username;
    var isAuthenticated = req.session.authenticated;
    var categories = [
        "food",
        "bills",
        "entertainment",
        "transportation",
        "personal_care",
        "shopping",
        "other"
    ];
    var category = categories[categoryIndex];
    var query = "UPDATE months SET ".concat(category, " = ").concat(category, " + $1 WHERE email = $2 AND year_month = $3");
    if (email && isAuthenticated) {
        pool.query(query, [amount, email, yearMonth], function (err) {
            if (err) {
                console.log(err);
            }
            else {
                res.status(200).json("success");
            }
        });
    }
    else {
        res.status(401).json("Unauthorized");
    }
});
app.post("/max-budget", function (req, res) {
    var amount = req.body.amount;
    var email = req.session.username;
    if (email && req.session.authenticated) {
        pool.query("UPDATE months SET max_budget = $1 WHERE email = $2 AND year_month = $3", [amount, email, getYearMonth()], function (err) {
            if (err) {
                console.log(err);
                res.status(500).json("Server Error");
            }
            else {
                res.status(200).json("success");
            }
        });
    }
});
app.post("/register", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var username, password;
    return __generator(this, function (_a) {
        username = req.body.email;
        password = req.body.password;
        try {
            pool.connect();
            pool.query("SELECT * FROM users WHERE email = $1;", [username], function (err, result) {
                if (err) {
                    console.log(err);
                }
                var userAvailable = !result.rows.length;
                if (userAvailable) {
                    try {
                        bcrypt.hash(password, saltRounds, function (err, hash) {
                            if (!err) {
                                pool.query("INSERT INTO users (email, password, picture) VALUES ($1, $2, NULL)", [username, hash])
                                    .catch(function (err) {
                                    if (err) {
                                        console.log(err);
                                    }
                                })
                                    .then(res.status(200).send("Successfully registered user"));
                            }
                            else
                                (console.log(err));
                        });
                    }
                    catch (error) {
                        console.log(error);
                    }
                }
                else
                    (res.status(409).json("Email is unavailable"));
            });
        }
        catch (error) {
            console.log("Error querying database: " + error);
        }
        return [2 /*return*/];
    });
}); });
app.post("/login", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var email, password;
    return __generator(this, function (_a) {
        email = req.body.email;
        password = req.body.password;
        try {
            pool.connect();
            pool.query("SELECT * FROM users WHERE email = $1", [email], function (err, result) {
                var foundUser = result.rows.length > 0;
                if (err) {
                    console.log(err);
                    res.status(500).json("server error");
                }
                if (foundUser) {
                    bcrypt.compare(password, result.rows[0].password, function (err, same) {
                        if (same) {
                            createCurrentMonth(email);
                            createBudget(email);
                            if (req.session.authenticated) {
                                res.status(200).json(email);
                            }
                            else {
                                console.log("setting cookies");
                                req.session.username = email;
                                req.session.authenticated = true;
                                req.session.save(function () {
                                    res.status(200).json(email);
                                });
                            }
                        }
                        else {
                            res.status(401).json("unauthorized");
                        }
                    });
                }
                else {
                    res.status(401).json("unauthorized");
                }
            });
        }
        catch (error) {
            console.log(error);
            res.status(500).json("server error");
        }
        return [2 /*return*/];
    });
}); });
app.get("/logout", function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.log(err);
            res.status(500).json("Server Error");
        }
        else {
            res.status(200).json("Success");
        }
    });
});
app.listen(5000, function () {
    console.log("server running on port 5000");
});
