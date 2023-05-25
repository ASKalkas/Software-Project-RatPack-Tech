const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi",sessionToken);
  const user = await db
    .select("*")
    .from("se_project.sessions")
    .where("token", sessionToken)
    .innerJoin(
      "se_project.users",
      "se_project.sessions.userid",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleid",
      "se_project.roles.id"
    )
   .first();

  console.log("user =>", user);
  user.isNormal = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;
  console.log("user =>", user)
  return user;
};

module.exports = function (app) {
  // example
  
/*
  app.put("/api/v1/requests/senior/:requestId" , async function(req,res){

    const reqidsenior = req.params;
    const reqs = req.body.status;
    const reqExists = await db
    .select("*")
    .from("se_project.senior_requests")
    .where("id", reqidsenior).first();
  if (!reqExists) {
    return res.status(404).send("request doesn't exist");
  }

  try {

    await db("se_project.senior_requests")
    .where("id", reqidsenior)
    .update({
      status : reqs
    })
    .returning("*");
    
     
   return res.status(200).send("done");
 } catch (e) {
   console.log(e.message);
   return res.status(400).send("error in query");
 }

  });
  */
  app.put("/api/v1/requests/senior/:requestId" , async function(req,res){

    const { requestId : reqid} = req.params;
    const reqExists = await db
    .select("*")
    .from("se_project.senior_requests")
    .where("id", reqid);
  if (isEmpty(reqExists)) {
    return res.status(400).send("request doesn't exist");
  }

  try {

    await db("se_project.senior_requests")
    .where("id", reqid)
    .update({
      status : req.body.seniorStaus
    })
    .returning("*");
    
     
   return res.status(200).send("done");
 } catch (e) {
   console.log(e.message);
   return res.status(400).send("error in query");
 }

  });



 

  app.put("/api/v1/requests/refunds/:requestId" , async function(req,res){

    const { requestId : reqid} = req.params;
    const reqExists = await db
    .select("*")
    .from("se_project.refund_requests")
    .where("id", reqid);
  if (isEmpty(reqExists)) {
    return res.status(400).send("request doesn't exist");
  }

  try {

    await db("se_project.refund_requests")
    .where("id", reqid)
    .update({
      status : req.body.refundStaus
    })
    .returning("*");
    
     
   return res.status(200).send("done");
 } catch (e) {
   console.log(e.message);
   return res.status(400).send("error in query");
 }






  });

  app.put("/api/v1/zones", async function (req, res){
   const zoneId = req.query.zoneId;
    const zoneExists = await db
    .select("*")
    .from("se_project.zones")
    .where("id", zoneId);
  if (isEmpty(zoneExists)) {
    return res.status(400).send("zone doesn't exist");
  }

    try {

      await db("se_project.zones")
      .where("id", zoneId)
      .update({
        price : req.body.price 
      })
      .returning("*");
      
       
     return res.status(200).send("update successfully");
   } catch (e) {
     console.log(e.message);
     return res.status(400).send("error zone price not updated");
   }

  
  });
  
  
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });
 


  
};
