const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 25565;
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

const inventory = require('./inventory.js');
const users = require('./users.js');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection',async (socket) => {
  var user_id = -1;
  var name = "";
  var admin = 0;
  var all_items = await query("SELECT * FROM items");

  socket.on('login',async (login, password, callback) => {
    let type = 0;
    var player = await query("SELECT * FROM users WHERE login = '"+login+"'");

    if( player.length < 1 ){
      callback("there's no such account!");
      return;
    }

    if( player[0].password == password ){
      callback("success!");

      if( user_id != -1 )
        await users.set(user_id,"online",0,function( msg ){
          callback(msg);
          console.log(name + " logged out!");
        });

      user_id = player[0].id;
      name = player[0].name;
      admin = player[0].admin;

      await users.set(user_id,"online",1,function( msg ){
        callback(msg);
        console.log(name + " logged in!");
      });
    }
    else
      callback("wrong password!");
  });

  socket.on('my_id',async (callback) => {
    callback(user_id);
  });

  socket.on('inventory',async (callback) => {
    var user_invertory = await query("SELECT * FROM inventories WHERE user_id = '"+user_id+"'");
    for(var i=0; i < user_invertory.length; i++ ){
      if( user_invertory[i].amount < 1 ){
        user_invertory.splice(i, 1);
        break;
      }
      for (var e = 0; e < all_items.length; e++) {
        if( all_items[e].id == user_invertory[i].item_id ){
          user_invertory[i].item_name = all_items[e].name;
          user_invertory[i].item_pic = all_items[e].picture;
          user_invertory[i].item_desc = all_items[e].description;
          break;
        }
      }
    }
    callback( JSON.stringify(user_invertory) );
  });

  socket.on('send_item',async (reciver_id, item_id, amount, callback) => {
    if( reciver_id != user_id )
      await inventory.send(user_id,reciver_id,item_id, amount,function( msg ){
        callback(msg);
      });
    else
      callback("you canno't send items to yourself!");
  });

  socket.on('change_name',async (new_name, callback) => {
    await users.set(user_id,"name",new_name,function( msg ){
      callback(msg);
      name = new_name;
    });
  });

  socket.on('admin_give_item',async (reciver_id, item_id, amount, callback) => {
    if( admin )
      await inventory.add(user_id,item_id, amount,function( msg ){
        callback(msg);
      });
    else
      callback("have no permissions!");
  });

  socket.on('admin_remove_item',async (reciver_id, item_id, amount, callback) => {
    if( admin )
      await inventory.remove(user_id,item_id, amount,function( msg ){
        callback(msg);
      });
    else
      callback("have no permissions!");
  });

  socket.on("disconnecting", async (reason) => {
    await users.set(user_id,"online",0,function( msg ){
      console.log(name + " logged out!");
    });
  });

});


http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});