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
      "se_project.sessions.userId",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleId",
      "se_project.roles.id"
    )
    .first();

  console.log("user =>", user);
  user.isNormal = user.roleId === roles.user;
  user.isAdmin = user.roleId === roles.admin;
  user.isSenior = user.roleId === roles.senior;
  return user;
};

module.exports = function (app) {
  // example
  app.put("/users", async function (req, res) {
    try {
      const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });

  app.post("/api/v1/route", async function (req, res) {

    // Check if user already exists in the system
    const routeExists = await db
      .select("*")
      .from("se_project.routes")
      .where("routename", req.body.routeName);
    if (!isEmpty(routeExists)) {
      return res.status(400).send("route exists");
    }

    const newRoute = {
      fromstationid: req.body.newStationId,
      tostationid: req.body.connectedStationId,
      routename: req.body.routeName,
    };
    try {
      const route = await db("se_project.routes").insert(newRoute).returning("*");

      return res.status(200).json(route );
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not add route");
    }
  });

  app.put("/api/v1/route/:routeId", async function (req, res) {
    const { routeId } = req.params;// access the request parameters
    const routeName = req.body.routename;
    const existingRoutes = await db
      .select("*")
      .from("se_project.routes")
      .where("id", routeId)
      .first();
  
    if (!existingRoutes) {
      return res.status(404).send("Routes does not exist");
    }
     try {
      await db("se_project.routes")
      .where("id", routeId)
      .update({
        routename : routeName
      })
      .returning("*");
      // Return a success message.
     res.status(200).send("Route updated successfully");

    } 
   catch (e) {
    console.log(e.message);
    res.status(400).json({error: "Unable to update Route name.", });
   }
  });
    // Get the new name of the station.
  
  // Update the station name.
  //const success = updateStation(stationId, newStationName);

  // Send a response to the client.
  // if (success) {
  //   res.status(200).json({
  //     success: true,
  //   });
  // } else {
  //   res.status(400).json({
  //     error: "Unable to update station name.",
  //   });
  
    // Update the station in the database.
    //await db
      //.update("se_project.stations")
    //  .where("id", stationId)
    //  .set({ stationName });
  
    
    


    app.delete("/api/v1/route/:routeId", async function(req,res){
      const {routeId:routeId }= req.params;
      const existingRoutes = await db
      .select("*")
      .from("se_project.routes")
      .where("id", routeId)
      .first();
      const fromStationId=existingRoutes.fromstationid
      const toStationId= existingRoutes.tostationid
      if(!existingRoutes){
        return res.status(404).send("Route does not exist");
      }
      await db("se_project.routes")
      .where("id", routeId)
      .delete();    
      const existingBackwardRoute = await db
      .select("*")
      .from("se_project.routes")
      .where("fromstationid" ,toStationId ).andWhere("tostationid", fromStationId)
      .first();
    const routeToStationExistsInTo = await db
    .select("*")
    .from("se_project.routes")
    .where("tostationid" ,toStationId )
    .first();
    const routeFromStationExistsInFrom = await db
    .select("*")
    .from("se_project.routes")
    .where("fromstationid" ,fromStationId )
    .first();
    const routeToStationExistsInFrom = await db
    .select("*")
    .from("se_project.routes")
    .where("fromstationid" ,toStationId )
    .first();
    const routeFromStationExistsInTo = await db
    .select("*")
    .from("se_project.routes")
    .where("tostationid" ,fromStationId )
    .first();
    if(existingBackwardRoute){
      return res.status(200).send("Route Deleted Succesfully" );
   }

   
   const routeFromExists = await db
      .select("*")
      .from("se_project.routes")
      .where("fromstationid" ,fromStationId ).orWhere("tostationid", fromStationId)
      .first();
      
      const routeToExists = await db
      .select("*")
      .from("se_project.routes")
      .where("fromstationid" ,toStationId ).orWhere("tostationid", toStationId)
      .first();

      if(!routeFromExists){
        await db("se_project.stations")
        .where("id", fromStationId)
        .update({
        stationstatus: "unconnected"
      });
      }
      if(!routeToExists){
        await db("se_project.stations")
        .where("id", toStationId)
        .update({
        stationstatus: "unconnected"
      });
    }

    const countToFrom=await db
    .count("*")
    .from("se_project.routes").
    where("fromstationid" ,toStationId);

    const countFromFrom=await db
    .count("*")
    .from("se_project.routes").
    where("fromstationid" ,fromStationId);

    const countFromTo=await db
    .count("*")
    .from("se_project.routes").
    where("tostationid" ,fromStationId );

    const countToTo=await db
    .count("*")
    .from("se_project.routes").
    where("tostationid" ,toStationId );
    if((countToFrom[0].count)>=2||(countToTo[0].count)>=2){
      return res.status(200).send("Route Deleted Succesfully" );    
    }
    if((countFromTo[0].count)>=2||(countFromFrom[0].count)>=2){
      return res.status(200).send("Route Deleted Succesfully" );  
    }

  if(routeToStationExistsInFrom){
    await db("se_project.stations")
      .where("id", toStationId)
      .update({
      stationposition: "start"
  });
}
  else if(routeToStationExistsInTo){
  await db("se_project.stations")
      .where("id", toStationId)
      .update({
      stationposition: "end"
 });
}
 
if(routeFromStationExistsInFrom){
  await db("se_project.stations")
    .where("id", fromStationId)
    .update({
    stationposition: "start"
});
}
else if(routeFromStationExistsInTo){
await db("se_project.stations")
    .where("id", fromStationId)
    .update({
    stationposition: "end"
});
}
return res.status(200).send("Route deleted successfully");
});
}
