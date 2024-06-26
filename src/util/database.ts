import mongoose, { MongooseError } from 'mongoose'
import handleError from './handleError.js'
import config from '../config.js'

// Connects when imported
const connect = () => {
    // Connect to the database
    mongoose.set('strictQuery', false);
    mongoose.connect(config.MONGO_URI)
    .then(() => {
        // Successfully connected
        console.log("Connected to the database")
    })
    .catch((err: MongooseError)=>{
        // Could not connect.  Stop server
        console.log("COULD NOT CONNECT TO DATABASE. ABORTING START...");
        handleError(err)
        setTimeout(()=>{
            connect();
        }, 10000)
    });
}
export default connect
