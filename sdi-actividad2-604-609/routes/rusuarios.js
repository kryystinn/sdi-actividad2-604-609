module.exports = function(app, swig, gestorBD) {


    // Registrarse
    app.get('/registrarse', function (req, res) {
        var respuesta = swig.renderFile('./sdi-actividad2-604-609/views/registro.html', {

        });
        res.send(respuesta);
    });

    // Añadir un nuevo usuario
    app.post('/usuario', function(req, res) {
            var pass = app.get("crypto").createHmac('sha256', app.get('clave'))
                .update(req.body.password).digest('hex');
            var passConf = app.get("crypto").createHmac('sha256', app.get('clave'))
                .update(req.body.passwordConfirm).digest('hex');

        if (pass === passConf) {
            var usuario = {
                email: req.body.email,
                name: req.body.nombre,
                surname: req.body.apellidos,
                password: pass,
                passwordConfirm: passConf
            };

            gestorBD.insertarUsuario(usuario, function (id) {
                if (id == null) {
                    //res.send("Error al insertar ");
                    //res.redirect("/registrarse?mensaje=Error al registrar usuario")
                } else {
                    res.redirect("/identificarse?mensaje=Nuevo usuario registrado");
                }
            });
        }
        else
            res.redirect("/registrarse?mensaje=Las contraseñas no coinciden");
    });

    // Identificarse
    app.get("/identificarse", function(req, res) {
        var respuesta = swig.renderFile('./sdi-actividad2-604-609/views/identificacion.html', {});
        res.send(respuesta);
    });

    // Comprobar si existe el usuario
    app.post("/identificarse", function(req, res) {
        var pass = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        var criterio = {
            email : req.body.email,
            password : pass
        };
        gestorBD.obtenerUsuarios(criterio, function(usuarios) {
            if (usuarios == null || usuarios.length == 0) {
                req.session.usuario = null;
                res.redirect("/identificarse" +
                    "?mensaje=Email o password incorrecto"+
                    "&tipoMensaje=alert-danger ");

            } else {
                req.session.usuario = usuarios[0].email;
                res.redirect("/tienda");
            }
        });
    });

    app.get('/desconectarse', function (req, res) {
        req.session.usuario = null;
        res.send("Usuario desconectado");
    })



};
