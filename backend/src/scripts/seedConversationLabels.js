require("dotenv").config();
const mongoose=require("mongoose");
const {ensureSystemLabels}=require("../services/messages/conversationOrganization.service");
(async()=>{try{const uri=process.env.MONGO_URI||process.env.MONGODB_URI;if(!uri)throw new Error("Falta MONGO_URI o MONGODB_URI.");await mongoose.connect(uri);const labels=await ensureSystemLabels();console.log(`Etiquetas listas: ${labels.length}`);}catch(e){console.error(e);process.exitCode=1;}finally{await mongoose.disconnect();}})();
