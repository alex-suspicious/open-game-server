const sqlite3 = require('sqlite3');

var db = new sqlite3.Database('./db.db', sqlite3.OPEN_READWRITE);

async function query( command ) {
    return new Promise((resolve, reject) => {
        db.all(command,(err, rows) => {
            if (err) reject(err); // I assume this is how an error is thrown with your db callback
            resolve(rows);
        });
    });
}

async function set(user_id, name, value, callback) {
    await query("UPDATE users SET "+name+" = "+value+" WHERE id = '"+user_id+"'");
    callback("success!");
}


module.exports = { set };