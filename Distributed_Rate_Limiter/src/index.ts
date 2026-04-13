import express from "express";


const Redis = require("ioredis");
const redis = new Redis();
const app = express();


app.get("/Me",async(req:any,res:any)=>{
    const userId = req.query.UserId;
    //// Check If the Request Can be Handled Or Not Using Fixed Slinding Window Counter
    let canProcess = await checkIfRequestCanBeProcessed(userId); /// 10 Requests Per 5 Seconds Capacity
    if(canProcess){
        res.status(429).send({message:"Rate Limit Reached Please Try After Some Time"});
    }
    else{
        res.status(200).send({message:"Rate Limit Not Reached"});
    }


});

const checkIfRequestCanBeProcessed = async(userId:any)=>{
    try{
        const Key = "RateLimiting:"+userId;
        let result = await redis.get(Key);
        if(result){
            //// Perform The Sliding Window Log Here And Check It can be Processed Or Not
            let LogArray = JSON.parse(result);
            /// Remove the old requests
            let CurrentTime = new Date().getTime();
            LogArray = LogArray.filter((existingrec:any)=>(CurrentTime - existingrec)/1000 <= 5); /// Filtered All the the Existing TimeStamps with <5 Seconds TTL
            if(LogArray.length > 10){
                return false; /// Cannot Process the Request Currently
            }
            else{
                LogArray.push(CurrentTime);
                await redis.set(Key,JSON.stringify(LogArray));
                return true;
            }
        }
        else{ // User is Coming First Time We Should Create a new record

            let LogArray = [new Date().getTime()];
            await redis.set(Key,JSON.stringify(LogArray));
            return true;
        }

    }
    catch(err){
         console.log("Some Error Has Occured",err);
        return false;
    }
}

app.listen(3000,()=>{
    console.log("Server Started on Port 3000");
})

///  Notes the Function CheckIfRequestCanbeProcessOrNot can Have Rece Conditions

/// Imagine I Send 12 requests at a same time and the Logarray is empty so my server will process all the requests at the Same time.

/// So In Order to Protect this Distributed Locks Here (... Learn About Redis Locking)