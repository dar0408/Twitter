var con = require('./connection');
var express = require('express');
var session = require('express-session');
var bp = require('body-parser');
var app = express();
var multer = require('multer');
var varify = require('./nodemail.js');

app.use(session({ secret: "darpan@2004" }));
app.use(bp.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + "/public"));

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/email/")
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + file.originalname)
    }
}) 
app.get('/', function (req, res) {
    var msg = "";
    if (req.session.msg != "")
        msg = req.session.msg;
    res.render('login', { msg: msg });
}) 

app.post('/login_submit', function (req, res) {
    var { email, password } = req.body;
    let sql = "";

    if (isNaN(email)) { 
        sql = "select * from user where email='" + email + "' and password='" + password + "' and status=1 and softdelete=0 ";
    }
    else {
        sql = "select * from user where mobile=" + email + " and password='" + password + "' and status=1 and softdelete=0 ";
    }
    con.query(sql, function (err, result, fields) {
        if (err) throw err;
        if (result.length == 0) {
            res.render('login', { msg: "Something Went Wrong Try Again" });
        }
        else { 
            req.session.userId = result[0].UID;
            req.session.un = result[0].fname;
            req.session.user = result[0]; // Set the user object in session

            res.redirect('/home');
        }
    })
})

app.get('/signup', function (req, res) {
    res.render('signup', { err: "" });
})

app.post('/signup_submit', function (req, res) {
    var { fname, mname, lname, email, password, cpassword, date, gender } = req.body;
    let sql_c = "";

    if (isNaN(email)) {
        sql_c = "SELECT email FROM user WHERE email='" + email + "' ";
    } else {
        sql_c = "SELECT mobile FROM user WHERE mobile=" + email + " ";
    }
 
    con.query(sql_c, function (err, result, fields) {
        if (err) throw err;

        if (result.length == 1) {
            let err = "";
            if (isNaN(email))
                err = "Email already Exist";
            else
                err = "Mobile Number already Exist";

            res.render('signup', { err: err });
        } else {
            let sql = "";
            let dob = req.body.dob;

            if (isNaN(email)) {
                sql = "INSERT INTO user(fname, mname, lname, email, password, dob, dor, gender) VALUES(?, ?, ?, ?, ?, ?, ?, ?) ";
            } else {
                sql = "INSERT INTO user(fname, mname, lname, mobile, password, dob, dor, gender) VALUES(?, ?, ?, ?, ?, ?, ?, ?) ";
            }

            let t = new Date();
            let m = t.getMonth() + 1;
            let dor = t.getFullYear() + "-" + m + "-" + t.getDate();

            con.query(sql, [fname, mname, lname, email, password, dob, dor, gender], function (err, result) {
                if (err) throw err;


                if (result.insertId > 0) {
                    if (isNaN(email))
                        varify(email);
                    req.session.msg = "Account Created, Please check mail for Varification";
                    res.redirect('/');
                } else {
                    res.render('signup', { err: "Can't Signup Try Again " });
                }
            });
        }
    });
});


app.get('/home', function (req, res) {
    if (req.session.userId != "") {
        let msg = "";
        if (req.session.msg != "")
            msg = req.session.msg;

        let sql = "SELECT * FROM tweet INNER JOIN user ON user.UID = tweet.uid WHERE tweet.uid = ? OR tweet.uid IN (SELECT follow_uid FROM user_following WHERE uid = ?) OR tweet.content LIKE CONCAT('%', ?, '%') ORDER BY tweet.datetime DESC";
        con.query(sql, [req.session.userId, req.session.userId, req.session.un], function (err, result, fields) {
            if (err) throw err;
            res.render('home', { result: result, msg: msg, currentUser: req.session.user }); // Pass the currentUser object
        })

    }
    else {
        req.session.msg = "Please Login ";
        res.redirect('/');
    }
})
 


app.get("/logout", function (req, res) {
    req.session.userId = "";
    res.redirect('/');
})

app.get("/editProfile", function (req, res) {
    con.query("select * from user where UID=?", [req.session.userId], function (err, result, fields) {
        if (err) throw err;
        if (result.length == 1)

            res.render('editProfile', { msg: "", result: result,currentUser: req.session.user })
        else {
            res.redirect('/')
        }
    })
})
app.post("/edit_done", function (req, res) {
    var { fname, mname, lname, bio } = req.body;
    let sql_update = "update user set fname=?,mname=?,lname=?,bio=? where UID=?";

    con.query(sql_update, [fname, mname, lname, bio, req.session.userId], function (err, result) {
        if (result.affectedRows == 1) {
            req.session.msg = "data updated";
            res.redirect('/home');
        }
        else {
            req.session.msg = "can't update profile";
            res.redirect('/home');
        }
    })

})
app.get('/follower', function (req, res) {
    let sql = "select * from user where UID in(select uid from user_following where follow_uid=?) ";
    con.query(sql, [req.session.userId], function (err, result, fields) {
        if (err) throw err;
        res.render('follower', { result: result, msg: "",currentUser: req.session.user })
    })
})
app.get('/following', function (req, res) {
    let sql = "select * from user where UID in(select follow_uid from user_following where uid=?) ";
    con.query(sql, [req.session.userId], function (err, result, fields) {
        if (err) throw err;
        res.render('following', { result: result, msg: "",currentUser: req.session.user })
    })
})
var upload_detail = multer({ storage: storage })

app.post('/tweet', upload_detail.single('tweet_img'), function (req, res) {
    var { content } = req.body;
    var filename = "";
    var mimetype = "";
    try {
        filename = req.file.filename;
        mimetype = req.file.mimetype;

    } catch (err) {

        console.log(err);
    }

    var d = new Date();
    var m = d.getMonth() + 1;
    var ct = d.getFullYear() + "-" + m + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    let sql = "insert into tweet(uid,content,datetime,image_vdo_name,type) values(?,?,?,?,?)";
    con.query(sql, [req.session.userId, content, ct, filename, mimetype], function (err, result) {
        if (err) throw err;
        if (result.insertId > 0) {
            req.session.msg = "Tweet Done";
        } else {
            req.session.msg = "Can't Tweet Your Post";
        }
        res.redirect('/home');
    }) 
})

app.get('/varify', function (req, res) {
    let email = req.query['email'];
    let sql_u = "update user set status=1 where email=?";
    con.query(sql_u, [email], function (err, result) {
        if (err) console.log(err)
        if (result.affectedRows == 1) {
            req.session.msg = "Email varified You May Proceed Further Process";
            res.redirect('/')
        }
        else {
            req.session.msg = "Can't Varify Email Contact Admin";
            res.redirect('/');
        }
    })
})

app.get("/changePassword", function (req, res) {
    var pas = "";
    if (req.session.pas != "")
        pas = req.session.pas;

    res.render('changePassword', { pas: pas,currentUser: req.session.user },);


})
app.post('/changedPassword', function (req, res) {
    if (req.session.userId) {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            res.render('changePassword', { pas: "New password and confirmation password don't match" });
        } else {
            // Check if the old password matches the one stored in the database
            const userId = req.session.userId;
            const checkPasswordQuery = "SELECT password FROM user WHERE UID = ?";

            con.query(checkPasswordQuery, [userId], function (err, result) {
                if (err) {
                    res.render('changePassword', { pas: "Internal server error" });
                } else if (result.length === 0) {
                    res.render('changePassword', { pas: "User Not Found" });
                } else {
                    const storedPassword = result[0].password;

                    if (oldPassword !== storedPassword) {
                        res.render('changePassword', { pas: "Old password don't match" });
                    } else {
                        // Update the password in the database
                        const updatePasswordQuery = "UPDATE user SET password = ? WHERE UID = ?";
                        con.query(updatePasswordQuery, [newPassword, userId], function (err, result) {
                            if (err) {
                                res.render('changePassword', { pas: "Failed to Update" });
                            } else {
                                res.render('changePassword', { pas: "Password changed" });
                            }
                        });
                    }
                }
            });
        }
    } else {
        req.session.msg = "Please Login";
        res.redirect('/');
    }
});


// Assuming you're using Express.js
app.post('/like_tweet', function(req, res) {
    var tid = req.body.tid;
    var uid = req.session.userId;

    var sql = "INSERT INTO tweet_like (tid, uid, datetime) VALUES (?, ?, NOW())";
    con.query(sql, [tid, uid], function(err, result) {
        if (err) {
            console.error("Error liking tweet: ", err);
            res.status(500).send("Error liking tweet");
        } else {
            res.redirect('/home'); // Redirect to the home page after liking
        }
    });
});

app.listen(8080);
console.log("server started");
 
