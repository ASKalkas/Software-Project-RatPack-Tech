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
    return res.render('manage');
  });
  app.get('/manage/stations/create', async function(req, res) {
    return res.render('manage_stations_create');
  });
  app.get('/manage/stations/edit/:stationId', async function(req, res) {
    const stationId = req.params.stationId;
  
    res.render('manage_stations_edit', { stationId });
});
  app.get('/prices', async function(req, res) {
    return res.render('prices');
  });
  app.get('/rides', async function(req, res) {
    return res.render('rides');
  });
  app.get('/rides/simulate', async function(req, res) {
    return res.render('simulate_ride');
  });

};
