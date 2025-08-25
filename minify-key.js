import fs from "fs";

const key = JSON.parse(fs.readFileSync("firebase-key.json", "utf8"));
key.private_key = key.private_key.replace(/\n/g, "\\n");
console.log(JSON.stringify(key));