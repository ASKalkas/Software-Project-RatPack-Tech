const db = require('../../connectors/db');
const roles = require('../../constants/roles');
const { getSessionToken } = require('../../utils/session');

const getUser = async function(req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect('/');
  }

  const user = await db.select('*')
    .from('se_project.sessions')
    .where('token', sessionToken)
    .innerJoin('se_project.users', 'se_project.sessions.userid', 'se_project.users.id')
    .innerJoin('se_project.roles', 'se_project.users.roleid', 'se_project.roles.id')
    .first();
  
  console.log('user =>', user)
  user.isStudent = user.roleid === roles.student;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;

  return user;  
}

module.exports = function(app) {
  // Register HTTP endpoint to render /users page
  app.get('/dashboard', async function(req, res) {
    const user = await getUser(req);
    return res.render('dashboard', user);
  });

  // Register HTTP endpoint to render /users page
  app.get('/users', async function(req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('users', { users });
  });
  app.get('/manage/stations', async function(req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('manage_stations', { ...user, stations });
  });
  app.get('/resetPassword', async function(req, res) {
    return res.render('resetpassword');
  });
  app.get('/manage', async function(req, res) {
    const user = await getUser(req);
    return res.render('manage', {...user});
  });
  app.get('/manage/stations/create', async function(req, res) {
    return res.render('manage_stations_create');
  });
  app.get('/manage/stations/edit/:stationId', async function(req, res) {
    const stationId = req.params.stationId;
  
    res.render('manage_stations_edit', { stationId });
});
  app.get('/prices', async function(req, res) {
    const stations = await db.select("*").from("se_project.stations");
    return res.render('prices', {stations});
  });
  app.get('/rides', async function(req, res) {
    return res.render('rides');
  });
  app.get('/rides/simulate', async function(req, res) {
    return res.render('simulate_ride');
  });
  app.get('/tickets', async function(req, res) {
    const user = await getUser(req);
    const userID = user.userid;
    const tickets = await db.select("*").from("se_project.tickets").where("userid", userID);
    return res.render('tickets', {tickets});
  });
  app.get('/tickets/purchase', async function(req, res) {
    const user = await getUser(req);
    const stations = await db.select("*").from("se_project.stations");
    return res.render('payTick', {user, stations});
  });
  app.get('/subscriptions', async function(req, res) {
    const user = await getUser(req);
    const userID = user.userid;
    const subscriptions = await db.select("*").from("se_project.subsription").where("userid", userID);
    return res.render('subscriptions', {subscriptions});
  });
  app.get('/subscriptions/purchase', async function(req, res) {
    const zones = await db.select("*").from("se_project.zones");
    return res.render('paySub', {zones});
  });
  app.get('/manage/zones', async function(req, res) {
    const user = await getUser(req);
    const zones = await db.select('*').from('se_project.zones').orderBy("id");
    return res.render('zones', {...user, zones});
  });
  app.get('/manage/requests', async function(req, res) {
    return res.render('requests');
  });
  app.get('/manage/requests/refunds', async function(req, res) {
    const refunds = await db.select("*").from("se_project.refund_requests").where("status", "pending");
    return res.render('refunds', {refunds});
  });
  app.get('/manage/requests/seniors', async function(req, res) {
    const seniors = await db.select("*").from("se_project.senior_requests").where("status", "pending");
    return res.render('seniors', {seniors});
  });
};
