// Módulos
var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

var swig = require('swig');


// Variables
app.set('port', 8081);


// lanzar el servidor
app.listen(app.get('port'), function() {
    console.log("Servidor activo");
});

//Rutas/controladores por lógica
require("./routes/rusuarios.js")(app, swig); // (app, param1, param2, etc.)

