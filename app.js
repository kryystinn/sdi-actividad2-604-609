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

var routerAdminSession = express.Router();
routerAdminSession.use(function (req, res, next) {
    var role = req.session.usuario.role;
    if (role == "admin") // dejamos correr la petición
        next();
    else
        res.redirect("/tienda?mensaje=Acceso denegado."+
            "&tipoMensaje=alert-danger");
});
app.use('/usuarios',routerAdminSession);

var routerUserSession = express.Router();
routerUserSession.use(function (req, res, next) {
    var role = req.session.usuario.role;
    if (role == "user") // dejamos correr la petición
        next();
    else
        res.redirect("/usuarios?mensaje=Acceso denegado."+
            "&tipoMensaje=alert-danger");
});
app.use('/tienda',routerUserSession);
app.use('/ofertas/*', routerUserSession);


// Variables
app.set('port', 8081);
app.set('db','mongodb://admin:604609@mywallapop-shard-00-00-tprww.mongodb.net:27017,mywallapop-shard-00-01-tprww.mongodb.net:27017,mywallapop-shard-00-02-tprww.mongodb.net:27017/test?ssl=true&replicaSet=mywallapop-shard-0&authSource=admin&retryWrites=true');
app.set('clave','abcdefg');
app.set('crypto',crypto);


//Rutas/controladores por lógica
require("./routes/rusuarios.js")(app, swig, gestorBD); // (app, param1, param2, etc.)
require("./routes/rofertas.js")(app, swig, gestorBD); // (app, param1, param2, etc.)


app.get('/', function (req, res) {
    res.redirect('/identificarse');
});

// funcion basica de manejo de errores
app.use(function (err, req, res, next) {
    console.log("Error producido: " + err); //we log the error in our db
    if (!res.headersSent) {
        res.status(400);
        res.send("Recurso no disponible");
    }
});

// lanzar el servidor
app.listen(app.get('port'), function() {
    console.log("Servidor activo");
});
