import "dotenv/config"
import { hashNumber } from "../Middleware/middleWare.js";
import { db, pool } from "./index.js";
import { users } from "./schema.js";

 async function seed(){
    const { DOC_NAME, DOC_EMAIL, DOC_PASS, DOC_PHONE } = process.env;
    if (!DOC_NAME || !DOC_EMAIL || !DOC_PASS) {
        throw new Error("DOC_NAME, DOC_EMAIL and DOC_PASS are required in .env");
    }
    const hashedPass = await hashNumber(DOC_PASS)
    const doctor =  await db.insert(users).values({name: DOC_NAME , email: DOC_EMAIL , password: hashedPass , phone:DOC_PHONE , verified:true , role:"DOCTOR"  }).onConflictDoNothing({target: users.email}).returning({id : users.id})
    console.log(doctor[0] ? "Doctor created" : "Doctor already exists, nothing to do");
   

}


seed().catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end()); 