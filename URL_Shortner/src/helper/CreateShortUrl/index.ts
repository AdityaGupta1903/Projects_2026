import { redis } from "../../index.js";

const getUrlHashCode = async (url: any) => {
    try {
        //// Get the redis counter
        let generateIdAndSetUrl = `
        local id = redis.call("INCR",KEYS[1])
        return id
        `
        /// redis will set ( url:1001 -> Long Url ) 

        let CounterKey = `UrlShortnerCounter` /// This Redis Key Stores the UrlShortnerCounter
        let GeneratedId = await redis.eval(generateIdAndSetUrl, 1, CounterKey);

        let Base62StringWithCounter = generateBase62(GeneratedId);

        await PutInDB(Base62StringWithCounter, url);

        return Base62StringWithCounter; /// Return this to user

    }
    catch (err) {

    }
}

const generateBase62 = (Id: any) => {
    try {
        /// generate base62 Code from the Id
    } catch (err) {
        console.log(err);
    }
}

const PutInDB = async (Base64Id: any, url: any) => {
    try {
        /// Put the URL in DB with Key Base64Id -> url
    }
    catch (err) {
        console.log(err);
    }
}

export { getUrlHashCode }

