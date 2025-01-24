import mongoose from 'mongoose'
mongoose.connect("mongodb+srv://230028:juses2005@bloxycluster.cedgg.mongodb.net/?retryWrites=true&w=majority&appName=BloxyCluster").then((db)=>console.log('MongoDB connected')).catch((error)=>console.log("Error "+error))
export default mongoose