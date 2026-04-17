import express from "express";
import { v4 as uuidv4 } from "uuid";


const Redis = require("ioredis");
const redis = new Redis();
const app = express();


app.get("/Me", async (req: any, res: any) => {
    const userId = req.query.UserId;
    //// Check If the Request Can be Handled Or Not Using Fixed Slinding Window Counter
    let canProcess = await checkIfRequestCanBeProcessed(userId); /// 10 Requests Per 5 Seconds Capacity
    if (canProcess) {
        res.status(429).send({ message: "Rate Limit Reached Please Try After Some Time" });
    }
    else {
        res.status(200).send({ message: "Rate Limit Not Reached" });
    }


});

const checkIfRequestCanBeProcessed = async (userId: any) => {
    try {
        const Key = "rate_limit:" + userId;
        let result = await redis.get(Key);
        if (result) {
            //// Perform The Sliding Window Log Here And Check It can be Processed Or Not
            let LogArray = JSON.parse(result);
            /// Remove the old requests
            let CurrentTime = new Date().getTime();
            LogArray = LogArray.filter((existingrec: any) => (CurrentTime - existingrec) / 1000 <= 5); /// Filtered All the the Existing TimeStamps with <5 Seconds TTL
            if (LogArray.length > 10) {
                return false; /// Cannot Process the Request Currently
            }
            else {
                LogArray.push(CurrentTime);
                await redis.set(Key, JSON.stringify(LogArray));
                return true;
            }
        }
        else { // User is Coming First Time We Should Create a new record

            let LogArray = [new Date().getTime()];
            await redis.set(Key, JSON.stringify(LogArray));
            return true;
        }

    }
    catch (err) {
        console.log("Some Error Has Occured", err);
        return false;
    }
}

app.listen(3000, () => {
    console.log("Server Started on Port 3000");
})

///  Notes the Function CheckIfRequestCanbeProcessOrNot can Have Rece Conditions

/// Imagine I Send 12 requests at a same time and the Logarray is empty so my server will process all the requests at the Same time.

/// So In Order to Protect this Distributed Locks Here (... Learn About Redis Locking)

/// To Fix this We will Use Lua Scripts (With Redis Locking)


const checkIfRequestCanBeProcessUsingLocks = async (UserId: any) => {
    try {
        let Lockey = `lock:rate_limit:${UserId}`;

        let DataKey = `rate_limit:${UserId}`;
        let LockValue = uuidv4();

        // Retry loop (important)
        for (let i = 0; i < 5; i++) {
            const lock = await accquireLock(Lockey, LockValue);

            if (lock) {
                try {
                    // critical section (same as previous logic)
                    let result = await redis.get(DataKey);

                    let logArray = result ? JSON.parse(result) : [];
                    const now = Date.now();

                    logArray = logArray.filter(
                        (t: number) => (now - t) / 1000 <= 5
                    );

                    if (logArray.length >= 10) {
                        return false;
                    }

                    logArray.push(now);
                    await redis.set(DataKey, JSON.stringify(logArray), "EX", 5);

                    return true;
                } finally {
                    await releaseLock(Lockey, LockValue);
                }
            }

            // wait before retry (backoff)
            await new Promise(res => setTimeout(res, 10));
        }

        return false; // failed to acquire lock
    }
    catch (err) {
        console.log("Some Error Has Occured");
        return false;
    }

}

const accquireLock = async (lockKey: string, lockValue: string) => {
    try {
        let result = await redis.set(lockKey, lockValue, "NX", "PX", 1000); /// NX is if key doesn't exists then add it.
        ///  PX is keep the key only for 100ms after that expire it. 
        ///  If the Key Already exists then redis will reject it.

        return result === "OK"
    }
    catch (err) {
        console.log(err);
        return false;
    }
}

const releaseLock = async (lockKey: string, lockValue: string) => {
    try {
        let luascript = `
         if redis.call("GET",KEYS[1]) == ARGV[1] then
            return redis.call("DEL",KEYS[1])
         else
            return 0
        end      
        `
        await redis.eval(luascript, 1, lockKey, lockValue); /// 1 is the Number of Keys used in the lua script
    } catch (err) {
        return 0;
    }
}