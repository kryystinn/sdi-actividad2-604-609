// Módulos
var express = require('express');
var app = express();

// modulo jsonwebtoken -> encriptaciones api rest
var jwt = require('jsonwebtoken');
app.set('jwt',jwt);

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

// routerUsuarioToken
var routerUserToken = express.Router();
routerUserToken.use(function (req, res, next) {
    // obtener el token, vía headers (opcionalmente GET y/o POST).
    var token = req.headers['token'] || req.body.token || req.query.token;
    if (token != null) {
        // verificamos el token
        jwt.verify(token, 'secreto', function (err, infoToken) {
            // Si no hay o no lo desencriptamos en mas de 240 seg -> error
            if (err || (Date.now() / 1000 - infoToken.tiempo) > 240) {
                res.status(403);
                res.json({
                    acceso: false,
                    error: 'Token invalido o caducado'
                });
                return;
            } else {
                // si lo desencriptamos dejamos correr la peticion
                res.usuario = infoToken.usuario;
                next();
            }
        });
    } else {
        res.status(403);
        res.json({
            acceso: false,
            mensaje: 'No hay Token'
        });
    }
});

// Aplicar routerUsuarioToken
app.use('/api/ofertas', routerUserToken);

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
require("./routes/rusuarios.js")(app, swig, gestorBD);
require("./routes/rofertas.js")(app, swig, gestorBD);
require("./routes/rapimywallapop.js")(app, gestorBD);

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
