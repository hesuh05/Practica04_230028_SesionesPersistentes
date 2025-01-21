import express from 'express'
import bodyParser from 'body-parser'
import {v4 as uuidv4} from 'uuid'
import session from 'express-session'
import moment from 'moment-timezone'
import os from 'os'
import cors from 'cors'

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
app.get('/',(req,res)=>{
    return res.status(200).json({
        message:"Bienvenido al API de Control de Sesiones",
        author: "Jesús Domínguez Ramírez"
    })
})
// Login endpoint
app.post("/login",(req,res)=>{
    console.log(req.body)
    const {email, nickname, macAddress}=req.body;
    if (!email || !nickname || !macAddress){
        return res.status(400).json({message:"Missing required fields"});
    }
    const sessionId = uuidv4();
    const now = new Date();
    const serverMac = getServerMacAddress(); 
    sessions[sessionId]={
        sessionId,
        email,
        nickname,
        macAddress,
        //serverMac,
        ip: getServerNetworkInfo(),
        createdAt:now,
        lastAccess:now
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
    app.put("/update",(req,res)=>{
        const {sessionId,email,nickname} = req.body;
        if (!sessionId || !sessions[sessionId]){
            return res.status(404).json({message:"No existe una sesión activa"});
        }
        if (email) sessions[sessionId].email = email
        if(nickname) sessions[sessionId].nickname = nickname;
        sessions[sessionId].lastAccess = new Date()
        res.status(200).json({
            message:"La sesión ha sido actualizada",
            session: session[sessionId]
        })
    })

    //Estatus
    app.get("/status",(req,res)=>{
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
