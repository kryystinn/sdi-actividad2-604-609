// Módulos
var express = require('express');
var app = express();


var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

var swig = require('swig');
var mongo = require('mongodb');
var crypto = require('crypto');

var gestorBD = require("./modules/gestorBD.js");
gestorBD.init(app,mongo);

var expressSession = require('express-session');
app.use(expressSession({
    secret: 'abcdefg',
    resave: true,
    saveUninitialized: true
}));


// Variables
app.set('port', 8081);
app.set('db','mongodb://admin:604609@mywallapop-shard-00-00-tprww.mongodb.net:27017,mywallapop-shard-00-01-tprww.mongodb.net:27017,mywallapop-shard-00-02-tprww.mongodb.net:27017/test?ssl=true&replicaSet=mywallapop-shard-0&authSource=admin&retryWrites=true');
app.set('clave','abcdefg');
app.set('crypto',crypto);


//Rutas/controladores por lógica
require("./routes/rusuarios.js")(app, swig, gestorBD); // (app, param1, param2, etc.)
require("./routes/rofertas.js")(app, swig, gestorBD); // (app, param1, param2, etc.)


app.get('/', function (req, res) {
    res.redirect('/tienda');
});

// lanzar el servidor
app.listen(app.get('port'), function() {
    console.log("Servidor activo");
});
