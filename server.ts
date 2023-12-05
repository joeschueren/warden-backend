const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const session = require("express-session");
const pg = require("pg");
const store = new session.MemoryStore();
require("dotenv").config();

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
    credentials: true,
    origin: "https://warden-finance.vercel.app"
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        sameSite: false,
        secure: true,
        httpOnly: true,
        maxAge: 3600000,
    },
  }));

const saltRounds= 5;

function getYearMonth(): string{
    const currentTime: Date = new Date();

    const year: number = currentTime.getFullYear();
    const month: string = String(currentTime.getMonth() + 1).padStart(2, '0');

    return `${year}/${month}`;
}

const connectionString = process.env.DB_CONNECTION_STRING;

const pool = new pg.Pool({connectionString})

try{
    pool.connect();

    const query= "CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, email VARCHAR(100), password text, picture BYTEA);"
    pool.query(query).catch((err: Error): void => console.log(err));

    pool.query(`CREATE TABLE IF NOT EXISTS months (
        id serial PRIMARY KEY,
        email VARCHAR(100),
        year_month VARCHAR(12),
        food NUMERIC(14,2),
        bills NUMERIC(14,2),
        entertainment NUMERIC(14,2),
        transportation NUMERIC(14,2),
        personal_care NUMERIC(14,2),
        shopping NUMERIC(14,2),
        other NUMERIC(14,2),
        max_budget NUMERIC(14,2));`)
    .catch((err: Error): void => console.log(err));

    pool.query(`CREATE TABLE IF NOT EXISTS budgets (
        id serial PRIMARY KEY,
        email VARCHAR(100),
        year_month VARCHAR(12),
        food NUMERIC(14,2),
        bills NUMERIC(14,2),
        entertainment NUMERIC(14,2),
        transportation NUMERIC(14,2),
        personal_care NUMERIC(14,2),
        shopping NUMERIC(14,2),
        other NUMERIC(14,2)
    )`)
    .catch((err: Error): void => console.log(err));

} catch (error){
    console.log(error);
}

function createCurrentMonth(email: string): void{
    pool.query("SELECT * FROM months WHERE email = $1 AND year_month = $2", [email, getYearMonth()],
    (err: any, result: any) => {
        if(err){
            console.log(err);
        }
        if(result.rows.length < 1){
            pool.query(`INSERT INTO months(
                email,
                year_month,
                food,
                bills,
                entertainment,
                transportation,
                personal_care,
                shopping,
                other,
                max_budget) VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0)`,
                [email, getYearMonth()],
                (err: any) => {
                    if(err){
                        console.log(err);
                    }
                })
        }
    })
}

function createBudget(email: string): void {
    pool.query("SELECT * FROM budgets WHERE email = $1 AND year_month = $2", [email, getYearMonth()],
    (err: any, result: any) => {
        if(!result.rows.length){
            pool.query(`INSERT INTO budgets (
                email,
                year_month,
                food,
                bills,
                entertainment,
                transportation,
                personal_care,
                shopping,
                other) VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0)`, [email, getYearMonth()],
                (err: any) => {
                    if(err){
                        console.log(err);
                    }
                })
        }
    })
}

app.get("/check-auth", (req: any, res:any) =>{
    if(req.session.authenticated && req.session.username){
        pool.query("SELECT * FROM users WHERE email = $1", [req.session.username],
        (err: any,  result:any)=> {
            if(result.rows.length > 0){
                const data = result.rows[0]
                res.status(200).json({email: req.session.username, picture: data.picture});
            }
        })
        
    }
    else{
        res.status(401).json("Unauthorized");
    }
})

app.get("/dashboard", async(req:any, res:any) => {
    const email = String(req.session.username);

    const yearMonth: string = getYearMonth();

    if(req.session.authenticated && email){
        let query = {
            text: "SELECT * FROM months WHERE email = $1 AND year_month = $2",
            values: [email, yearMonth]
        }

        interface ResData {
            date: string,
            monthData: number[],
            budgetData: number[],
            maxBudget: number,
            pastMonths: object[],
            image: Blob
        }

        let resData: ResData = {
            date: "",
            monthData: [],
            budgetData: [],
            maxBudget: 0,
            pastMonths: [],
            image: new Blob
        };

        pool.query(query, (err: any, result: any) => {
            if(result.rows.length > 0){
                const data = result.rows[0];
                resData.date = yearMonth;
                resData.monthData = [
                        parseFloat(data.food),
                        parseFloat(data.bills),
                        parseFloat(data.entertainment),
                        parseFloat(data.transportation),
                        parseFloat(data.personal_care),
                        parseFloat(data.shopping),
                        parseFloat(data.other),
                    ]
            }
        })


        pool.query("SELECT * FROM budgets WHERE email = $1 AND year_month = $2", [email, getYearMonth()],
        (err: any, result: any) => {
            if(result.rows.length > 0){
                const data = result.rows[0];
                resData.budgetData = [
                    parseFloat(data.food),
                    parseFloat(data.bills),
                    parseFloat(data.entertainment),
                    parseFloat(data.transportation),
                    parseFloat(data.personal_care),
                    parseFloat(data.shopping),
                    parseFloat(data.other)
                ] 
                resData.maxBudget = parseFloat(data.max_budget);
                
            }
        })

        pool.query("SELECT * FROM months WHERE email = $1", [email],
            (err: any, result: any) =>{
                if(err){
                    res.status(500).json("Server Error")
                }

                if(result.rows.length > 0){
                    const monthArr = result.rows.map((row: any) => ({...row}))
                    resData.pastMonths = monthArr;
                    console.log(res.data);
                }
                
            })

        pool.query("SELECT * FROM users WHERE email = $1", [email],
        (err: any, result:any) =>{
            if(result.rows.length > 0){
                const data = result.rows[0];

                resData.image = data.picture;

                res.json(resData);
            }
            else{
                res.json(resData);
            }
        })


    }
    else{
        res.status(401).json([])
    }
})

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/upload-picture",upload.single("imageData"), (req:any ,res:any) => {
    console.log("uploading picture");
    const email = req.session.username;
    const imageData = req.file.buffer;

    console.log("ImageData: "+imageData);

    if(email && req.session.authenticated){
        pool.query("UPDATE users SET picture = $1 WHERE email = $2", [imageData, email],
        (err:any, result:any) => {
            if(err){
                console.log(err);
                res.status(500).json("server error")
            }
            else{
                res.status(200).json("Success")
            }
        })
    }
    else{
        res.status(401).json("Unauthorized");
    }
})


app.get("/get-budgets", (req: any, res: any) => {
    const email = req.session.username;

    if(email && req.session.authenticated){
        pool.query("SELECT * FROM budgets WHERE email = $1 AND year_month = $2", [email, getYearMonth()],
        (err: any, result: any) => {
            if(err){
                console.log(err);
            }

            if(result.rows.length > 0){
                const data = result.rows[0]
                const resData = [
                    data.food,
                    data.bills,
                    data.entertainment,
                    data.transportation,
                    data.personal_care,
                    data.shopping,
                    data.other
                ]
                res.status(200).json(resData);
            }
        })
    }
    else{
        res.status(401).json("Unauthorized");
    }
})

app.post("/set-budget", (req: any, res: any) => {
    const email = req.session.username;
    const budgets = req.body;

    if(email && req.session.authenticated){
        pool.query(`UPDATE budgets SET
            food = $1,
            bills = $2,
            entertainment = $3,
            transportation = $4,
            personal_care = $5,
            shopping = $6,
            other = $7
            WHERE email = $8 AND year_month = $9`,
            [budgets.food, budgets.bills, budgets.entertainment, budgets.transportation, budgets.personal,
            budgets.shopping, budgets.other, email, getYearMonth()],
            (err: any) => {
                if(err){
                    res.status(500).json("Server Error");
                }
            }
        )
    }
    else{
        res.status(401).json("Unauthorized");
    }

})


app.post("/transaction", (req: any, res: any) => {
    const categoryIndex = req.body.category;
    const amount = req.body.amount;
    const yearMonth: string = getYearMonth();
    const email = req.session.username;
    const isAuthenticated = req.session.authenticated;

    const categories = [
        "food",
        "bills",
        "entertainment",
        "transportation",
        "personal_care",
        "shopping",
        "other"
    ]

    const category = categories[categoryIndex];

    const query = `UPDATE months SET ${category} = ${category} + $1 WHERE email = $2 AND year_month = $3`;


    if(email && isAuthenticated){
        pool.query(query, [amount, email, yearMonth], (err: any) => {
            if(err){
                console.log(err);
            }
            else{
                res.status(200).json("success");
            }
        })
    }
    else{
        res.status(401).json("Unauthorized");
    }
})

app.post("/max-budget", (req: any, res: any) => {
    const amount = req.body.amount;
    const email = req.session.username;

    if(email && req.session.authenticated){
        pool.query("UPDATE months SET max_budget = $1 WHERE email = $2 AND year_month = $3",
        [amount, email, getYearMonth()],
        (err: any)=>{
            if(err){
                console.log(err);
                res.status(500).json("Server Error");
            }
            else{
                res.status(200).json("success");
            }
        })
    }
})


app.post("/register", async (req: any, res: any) => {
    const username: string = req.body.email;
    const password: string = req.body.password;

    try{

        pool.connect();

        pool.query("SELECT * FROM users WHERE email = $1;", [username], (err: any, result: any) =>{
            if(err){
                console.log(err);
            }
            let userAvailable = !result.rows.length;

            if(userAvailable){
                try{
                    bcrypt.hash(password, saltRounds, function(err: any, hash:any){
                        if(!err){
                            pool.query("INSERT INTO users (email, password, picture) VALUES ($1, $2, NULL)", [username, hash])
                                .catch((err: any) => {
                                    if(err){
                                        console.log(err);
                                    }
                                })
                            .then(res.status(200).send("Successfully registered user"));
                        }
                        else(console.log(err))
                    });
                }
                catch (error){
                    console.log(error);
                }

            }
            else(res.status(409).json("Email is unavailable"))
        }
        )}
        catch (error){
            console.log("Error querying database: "+error);
        }
})


app.post("/login", async (req:any, res:any) =>{
    const email = req.body.email;
    const password = req.body.password;

    try{
        pool.connect()

        pool.query("SELECT * FROM users WHERE email = $1", [email], (err: any, result: any) =>{
            const foundUser = result.rows.length > 0;

            if(err){
                console.log(err);
                res.status(500).json("server error");
            }

            if(foundUser){
                bcrypt.compare(password, result.rows[0].password, (err: any, same:boolean) => {
                    if(same){
                        createCurrentMonth(email);
                        createBudget(email);
                        if(req.session.authenticated){
                            res.status(200).json(email);
                        }
                        else{
                            console.log("setting cookies");
                            req.session.username = email;
                            req.session.authenticated = true;
                            res.status(200).json(email);
                        }
                        
                    }
                    else{
                        res.status(401).json("unauthorized");
                    }
                });
            }
            else{
                res.status(401).json("unauthorized");
            }
        })
    }
    catch(error){
        console.log(error);
        res.status(500).json("server error");
    }
})

app.get("/logout", (req:any, res:any) => {
    req.session.destroy((err: any) => {
        if(err){
            console.log(err);
            res.status(500).json("Server Error");
        }
        else{
            res.status(200).json("Success");
        }
    })
})

app.listen(5000, (): void=>{
    console.log("server running on port 5000");
});