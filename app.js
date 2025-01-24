import express from 'express'
import bodyParser from 'body-parser'
import {v4 as uuidv4} from 'uuid'
import session from 'express-session'
import moment from 'moment-timezone'
import os from 'os'
import cors from 'cors'
import './database.js'
//10.10.60.27 Marco
//10.10.60.15 Citlali
const app = express();
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(cors({
    origin:[
        ''
    ]
}))
app.listen(3000,()=>{
    console.log("Servidor corriendo en el puerto 3000")
})
// Configuración de las sesiones
app.use(session({
    secret:"P4-JDR#witchsoda-SesionesHTTP-VariablesDeSesion",
    resave:false,
    saveUninitialized:false,
    cookie:{maxAge:5*60*1000}
}))
// Sesiones almacenadas en Memoria (RAM)
const sessions = {}
//Funcion que permite acceder a la información de la interfaz de red en este caso LAN
const getClientIp = (req) =>{
    return(
        req.header["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket?.remoteAddress
    )
}
const getLocalIp = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            // IPv4 y no interna (no localhost)
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null; // Retorna null si no encuentra una IP válida
};
// Funcion de utilidad que nos permitira acceder a la información de la interfaz de la red
const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces){
        for (const iface of interfaces[name]){
            if (iface.family === 'IPv4' && !iface.internal){
                return {
                    serverIp: iface.address,
                    serverMac: iface.mac
                }
            }
        }
    }
}
const getServerMacAddress = () => {
    const networkInterfaces = os.networkInterfaces();
    for (let interfaceName in networkInterfaces) {
        const interfaceInfo = networkInterfaces[interfaceName];
        for (let i = 0; i < interfaceInfo.length; i++) {
            const address = interfaceInfo[i];
            if (address.family === 'IPv4' && !address.internal) {
                return address.mac;  // Retorna la dirección MAC de la interfaz de red
            }
        }
    }
    return null; // Si no se encuentra, devuelve null
};
const auth = (req,res,next) => {
    console.log("hola")
    if (req.session){
        const ultimoAcceso = moment(req.session.lastAccess)
        const ahora = moment()
        console.log(ultimoAcceso)
        console.log(ahora)
        const inactividad = ahora-ultimoAcceso
        console.log(inactividad)
        if(inactividad>=120000){
            req.session.destroy((err)=>{
                if (err){
                    return res.status(500).send('Error al cerrar sesión')
                }
                return res.send('La sesión ha sido cerrada automáticamente por inactividad')
            })
            return
        } else {
            const minutos = Math.floor((inactividad/(1000*60)));
            console.log(minutos)
            const segundos = Math.floor((inactividad%(1000*60))/1000);
            req.session.idle_activity=`${minutos} minutos, ${segundos} segundos`;
        }
    }
    next()
}
app.get('/',(req,res)=>{
    return res.status(200).json({
        message:"Bienvenido al API de Control de Sesiones",
        author: "Jesús Domínguez Ramírez"
    })
})
// Login endpoint
app.post("/login",auth,(req,res)=>{
    console.log(req.body)
    const {email, nickname, macAddress}=req.body;
    if (!email || !nickname || !macAddress){
        return res.status(400).json({message:"Missing required fields"});
    }
    const sessionId = uuidv4();
    const serverMac = getServerMacAddress(); 
    const inicio = moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss')
    sessions[sessionId]={
        sessionId,
        email,
        nickname,
        macAddress,
        //serverMac,
        ip: getServerNetworkInfo(),
        createdAt:moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
        lastAccess:moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
        idle_activity:`0 minutos, 0 segundos`
    }

    res.status(200).json({
        message:"Se ha logeado de manera exitosa",
        sessionId,
    })

    //Logout endpoint
    app.post("/logout",(req,res)=>{
        const {sessionId} = req.body;
        if (!sessionId || !sessions[sessionId]){
            return res.status(404).json({
                message:"No se ha encontrado una sesión activa."
            })
        }
        delete sessions[sessionId]
        req.session.destroy((err)=>{
            if (err){
                return res.status(500).send('Error al cerrar la sesión');
            }
        })
        res.status(200).json({message:"Logout succesful"})
    })

    //Actualización de la Sesión
    app.put("/update",auth,(req,res)=>{
        const {sessionId,email,nickname} = req.body;
        if (!sessionId || !sessions[sessionId]){
            return res.status(404).json({message:"No existe una sesión activa"});
        }

        if (email) sessions[sessionId].email = email
        if(nickname) sessions[sessionId].nickname = nickname;
        req.session.lastAccess=moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss')
        const ultimoAcceso = new Date(req.session.lastAccess);
        const ahora = new Date()
        const inactividad = ahora-ultimoAcceso;
        const minutos = Math.floor((inactividad%(1000*60*60))/(1000*60));
        const segundos = Math.floor((inactividad%(1000*60))/1000);
        console.log(inactividad)
        req.session.idle_activity=`${minutos} minutos, ${segundos} segundos`;
        sessions[sessionId].lastAccess = req.session.lastAccess
        res.status(200).json({
            message:"La sesión ha sido actualizada",
            session: session[sessionId]
        })
    })

    //Estatus
    app.get("/status",auth,(req,res)=>{
        const sessionId = req.query.sessionId;

        if(!sessionId || !sessions[sessionId]){
            res.status(404).json({message:"No hay sesión activa"})
        }
        res.status(200).json({
            message:"Sesion Activa",
            session:sessions[sessionId]
        })
    })
    // Endpoint para obtener la lista de sesiones activas
    app.get("/sessions", (req, res) => {
        if (Object.keys(sessions).length === 0) {
            return res.status(404).json({ message: "No hay sesiones activas" });
        }

        const activeSessions = Object.values(sessions); // Convierte el objeto de sesiones en un array
        res.status(200).json({
            message: "Lista de sesiones activas",
            sessions: activeSessions,
        });
    });

})
