-- Insert Roles
INSERT INTO se_project.roles("role")
	VALUES ('user');
INSERT INTO se_project.roles("role")
	VALUES ('admin');
INSERT INTO se_project.roles("role")
	VALUES ('senior');	

-- Insert data into Zones
INSERT INTO se_project.zones("zonetype", "price")
	VALUES ('9', 5);
INSERT INTO se_project.zones("zonetype", "price")
	VALUES ('16', 7);
INSERT INTO se_project.zones("zonetype", "price")
	VALUES ('greater', 10);
-- Set user role as Admin
UPDATE se_project.users
	SET "roleid"=2
	WHERE "email"='desoukya@gmail.com';
