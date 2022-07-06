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

async function remove(user_id, item_id, amount, callback) {
    var user = await query("SELECT * FROM users WHERE id = '"+user_id+"'");

    if( user.length < 1 ){
      callback("there's no such account!");
      return;
    }

    var user_item = await query("SELECT * FROM inventories WHERE item_id = '"+item_id+"' AND user_id = '"+user_id+"'");

    if( user_item.length < 1 ){
      callback("You have no that item!");
      return;
    }

    var end_amount = user_item[0].amount-amount;

    if( end_amount < 0 ){
      callback("You have no that amount!");
      return;
    }
    
    await query("UPDATE inventories SET amount = "+end_amount+" WHERE id = '"+user_item[0].id+"'");
    

    callback("success!");
}

async function add(user_id, item_id, amount, callback) {
    var user = await query("SELECT * FROM users WHERE id = '"+user_id+"'");

    if( user.length < 1 ){
      callback("there's no such account!");
      return;
    }

    var user_item = await query("SELECT * FROM inventories WHERE item_id = '"+item_id+"' AND user_id = '"+user_id+"'");

    if( user_item.length < 1 ){
      await query("INSERT INTO inventories (user_id, item_id, amount) VALUES ("+user_id+", "+item_id+", "+amount+")");
    }else{
      var end_amount = user_item[0].amount+amount;
      await query("UPDATE inventories SET amount = "+end_amount+" WHERE id = '"+user_item[0].id+"'");
    }
    
    callback("success!");
}

async function send(sender_id, reciver_id, item_id, amount, callback) {
    await remove(sender_id,item_id,amount,function( msg1 ) {
      if( msg1 == "success!" ){
        add(reciver_id,item_id,amount,function( msg2 ){
          callback(msg2);
        });
      }
    })
}

module.exports = { remove, add, send };